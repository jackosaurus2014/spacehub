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

// ---------------------------------------------------------------------------
// Batch 1: Additional Launch Providers (18 companies, all tier 3)
// ---------------------------------------------------------------------------

const COMPANIES: CompanyData[] = [
  // 1. Orbex (UK)
  {
    name: 'Orbex',
    legalName: 'Orbex Space Ltd',
    headquarters: 'Forres, Scotland',
    country: 'United Kingdom',
    foundedYear: 2015,
    employeeRange: '51-200',
    employeeCount: 130,
    website: 'https://orbex.space',
    description: 'Orbex is a UK-based launch company developing the Prime micro-launcher, the first orbital rocket designed to run on renewable bio-propane fuel. The company is building a vertical launch facility at Space Hub Sutherland in the Scottish Highlands.',
    longDescription: 'Orbex is developing Prime, a two-stage orbital launch vehicle powered by bio-propane, a renewable fuel that reduces carbon emissions by up to 90% compared to traditional kerosene-based rockets. The company has secured a launch site at Space Hub Sutherland on the northern coast of Scotland and has completed extensive engine testing at its facilities. Prime is designed to deliver payloads of up to 180 kg to sun-synchronous orbit, targeting the growing small satellite market.',
    ceo: 'Phillip Chambers',
    sector: 'launch',
    subsector: 'micro-launch',
    tags: ['micro-launch', 'green-propulsion', 'bio-propane', 'uk-space', 'polar-orbit'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 72000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2022-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Prime',
        category: 'Launch Vehicle',
        description: 'Two-stage micro-launcher using bio-propane fuel, capable of delivering up to 180 kg to SSO. Features 3D-printed engine and carbon fiber structure.',
        status: 'in-development',
        specs: {
          payloadToSSO: '180 kg',
          stages: 2,
          fuel: 'Bio-propane / Liquid Oxygen',
          height: '19 m',
          diameter: '1.3 m',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Phillip Chambers',
        title: 'CEO',
        role: 'executive',
        bio: 'CEO of Orbex, leading the development of the Prime micro-launcher and the UK commercial launch market.',
        previousCompanies: ['Interxion'],
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'Orbex Founded',
        description: 'Orbex was founded to develop low-cost, sustainable micro-launch services for the small satellite market.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Orbex HQ & Manufacturing',
        type: 'headquarters',
        city: 'Forres',
        state: 'Scotland',
        country: 'United Kingdom',
      },
      {
        name: 'Space Hub Sutherland Launch Site',
        type: 'launch-site',
        city: 'Sutherland',
        state: 'Scotland',
        country: 'United Kingdom',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },

  // 2. Skyrora (UK)
  {
    name: 'Skyrora',
    legalName: 'Skyrora Ltd',
    headquarters: 'Edinburgh, Scotland',
    country: 'United Kingdom',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 120,
    website: 'https://www.skyrora.com',
    description: 'Skyrora is a UK launch company developing the Skyrora XL orbital rocket for polar and sun-synchronous launches from Scotland. The company uses a unique hydrogen peroxide-based fuel and has successfully tested suborbital vehicles.',
    longDescription: 'Skyrora is building the Skyrora XL, a three-stage orbital launch vehicle designed to deliver payloads of up to 315 kg to low Earth orbit from launch sites in Scotland. The company has completed multiple suborbital test flights and extensive engine testing. Skyrora is notable for its use of Ecosene, a high-performance kerosene derived from recycled plastic waste, and its focus on sustainable launch operations.',
    ceo: 'Volodymyr Levykin',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'polar-launch', 'uk-space', 'sustainable-fuel', 'scotland'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 80000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2022-09-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Skyrora XL',
        category: 'Launch Vehicle',
        description: 'Three-stage orbital launch vehicle capable of delivering 315 kg to LEO from Scottish launch sites. Uses Ecosene recycled plastic fuel.',
        status: 'in-development',
        specs: {
          payloadToLEO: '315 kg',
          payloadToSSO: '215 kg',
          stages: 3,
          fuel: 'Ecosene (recycled plastic kerosene) / Hydrogen Peroxide',
          height: '23 m',
          diameter: '1.4 m',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Volodymyr Levykin',
        title: 'CEO & Founder',
        role: 'executive',
        bio: 'Founded Skyrora to establish a sovereign UK launch capability for small satellites from Scottish launch sites.',
      },
    ],
    events: [
      {
        date: '2017-01-01',
        type: 'founding',
        title: 'Skyrora Founded',
        description: 'Skyrora was established in Edinburgh to develop small orbital launch vehicles for the UK market.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Skyrora HQ',
        type: 'headquarters',
        city: 'Edinburgh',
        state: 'Scotland',
        country: 'United Kingdom',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 45 },
    ],
  },

  // 3. HyImpulse (Germany)
  {
    name: 'HyImpulse',
    legalName: 'HyImpulse Technologies GmbH',
    headquarters: 'Neuenstadt am Kocher, Germany',
    country: 'Germany',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.hyimpulse.de',
    description: 'HyImpulse is a German launch startup developing small orbital rockets using innovative hybrid propulsion technology with paraffin-based solid fuel. The company was spun out of the German Aerospace Center (DLR).',
    longDescription: 'HyImpulse Technologies was founded as a spin-off from the German Aerospace Center (DLR) to commercialize hybrid propulsion technology. Their approach uses paraffin-based solid fuel combined with liquid oxygen, offering a simpler and safer alternative to traditional liquid or solid rocket engines. The company is developing the SL1 small launch vehicle targeting the growing small satellite launch market in Europe.',
    ceo: 'Mario Kobald',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'hybrid-propulsion', 'german-space', 'dlr-spinoff', 'paraffin-fuel'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 35000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'SL1',
        category: 'Launch Vehicle',
        description: 'Small launch vehicle using hybrid paraffin/LOX propulsion, targeting 500-600 kg to LEO. Designed for responsive and affordable European launch services.',
        status: 'in-development',
        specs: {
          payloadToLEO: '500-600 kg',
          stages: 3,
          fuel: 'Paraffin (hybrid solid) / Liquid Oxygen',
          height: '28 m',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Mario Kobald',
        title: 'CEO & Co-Founder',
        role: 'executive',
        bio: 'Co-founded HyImpulse from DLR research into hybrid propulsion. Leading development of the SL1 launch vehicle.',
        previousCompanies: ['DLR'],
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'HyImpulse Founded',
        description: 'HyImpulse Technologies was founded as a DLR spin-off to commercialize hybrid rocket propulsion technology.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'HyImpulse HQ & Development Center',
        type: 'headquarters',
        city: 'Neuenstadt am Kocher',
        state: 'Baden-Württemberg',
        country: 'Germany',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 40 },
    ],
  },

  // 4. Copenhagen Suborbitals (Denmark)
  {
    name: 'Copenhagen Suborbitals',
    legalName: 'Copenhagen Suborbitals',
    headquarters: 'Copenhagen, Denmark',
    country: 'Denmark',
    foundedYear: 2008,
    employeeRange: '1-10',
    employeeCount: 5,
    website: 'https://copenhagensuborbitals.com',
    description: 'Copenhagen Suborbitals is the world\'s only crowdfunded, non-profit crewed spaceflight program. The volunteer-run organization is developing open-source rockets with the goal of sending a person to the edge of space on a suborbital trajectory.',
    longDescription: 'Copenhagen Suborbitals is a unique non-profit organization working toward crewed suborbital spaceflight using entirely crowdfunded resources and volunteer labor. Founded by Kristian von Bengtson and Peter Madsen, the project has conducted multiple rocket and capsule tests from a sea-based launch platform in the Baltic Sea. The organization publishes all of its designs and findings openly, making it the most prominent open-source space program in the world.',
    sector: 'launch',
    subsector: 'suborbital',
    tags: ['suborbital', 'crewed-spaceflight', 'open-source', 'non-profit', 'crowdfunded'],
    tier: 3,
    status: 'active',
    ownershipType: 'non-profit',
    products: [
      {
        name: 'Spica Rocket',
        category: 'Launch Vehicle',
        description: 'Suborbital crewed rocket designed to carry a single person past the Karman line. Liquid bipropellant engine with a custom-built capsule.',
        status: 'in-development',
        specs: {
          type: 'Suborbital crewed vehicle',
          crew: 1,
          fuel: 'Ethanol / Liquid Oxygen',
          targetAltitude: '100+ km',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Kristian von Bengtson',
        title: 'Co-Founder & Former Capsule Lead',
        role: 'founder',
        bio: 'Co-founded Copenhagen Suborbitals in 2008. Aerospace engineer who led capsule design before departing. Previously worked at NASA Ames Research Center.',
        previousCompanies: ['NASA Ames'],
      },
    ],
    events: [
      {
        date: '2008-01-01',
        type: 'founding',
        title: 'Copenhagen Suborbitals Founded',
        description: 'Copenhagen Suborbitals was founded as an open-source, crowdfunded crewed spaceflight project by Kristian von Bengtson and Peter Madsen.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Copenhagen Suborbitals Workshop',
        type: 'manufacturing',
        city: 'Copenhagen',
        country: 'Denmark',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 32 },
    ],
  },

  // 5. Interstellar Technologies (Japan)
  {
    name: 'Interstellar Technologies',
    legalName: 'Interstellar Technologies Inc.',
    headquarters: 'Taiki, Hokkaido, Japan',
    country: 'Japan',
    foundedYear: 2003,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.istellartech.com',
    description: 'Interstellar Technologies is a Japanese aerospace startup developing the ZERO small orbital launch vehicle. The company made history as the first private Japanese company to reach space with its MOMO sounding rocket in 2019.',
    longDescription: 'Founded by Takafumi Horie, Interstellar Technologies began with sounding rockets and achieved a major milestone in 2019 when its MOMO-3 rocket became the first privately-developed Japanese rocket to reach space. The company is now developing ZERO, a small orbital launch vehicle designed to deliver payloads to low Earth orbit, positioning itself as a key player in Japan\'s emerging commercial space launch market.',
    ceo: 'Takahiro Inagawa',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'japanese-space', 'sounding-rocket', 'orbital-launch', 'private-japanese'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 45000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2023-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'ZERO',
        category: 'Launch Vehicle',
        description: 'Small orbital launch vehicle under development, designed to deliver payloads to LEO from Hokkaido. Successor to the MOMO suborbital rocket program.',
        status: 'in-development',
        specs: {
          payloadToLEO: '~100 kg',
          stages: 2,
          fuel: 'Liquid (TBD)',
          type: 'Small Orbital Launch Vehicle',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Takahiro Inagawa',
        title: 'CEO',
        role: 'executive',
        bio: 'President of Interstellar Technologies, leading development of the ZERO orbital rocket and commercial launch operations from Hokkaido.',
      },
    ],
    events: [
      {
        date: '2003-01-01',
        type: 'founding',
        title: 'Interstellar Technologies Founded',
        description: 'Interstellar Technologies was founded in Hokkaido, Japan, with the long-term goal of developing affordable commercial launch vehicles.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Interstellar Technologies HQ & Launch Site',
        type: 'headquarters',
        city: 'Taiki',
        state: 'Hokkaido',
        country: 'Japan',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 44 },
    ],
  },

  // 6. Space One (Japan)
  {
    name: 'Space One',
    legalName: 'Space One Co., Ltd.',
    headquarters: 'Tokyo, Japan',
    country: 'Japan',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 100,
    website: 'https://www.space-one.co.jp',
    description: 'Space One is a Japanese launch company developing the KAIROS small solid-fuel rocket for rapid-response orbital launch services. Backed by Canon Electronics, IHI Aerospace, and other major Japanese corporations.',
    longDescription: 'Space One was established as a joint venture between Canon Electronics, IHI Aerospace, Shimizu Corporation, and the Development Bank of Japan. The company is developing KAIROS, a four-stage solid-propellant rocket designed for rapid-turnaround launches of small satellites. Operating from the Kii Space Launch Center in Wakayama Prefecture, Space One aims to provide high-frequency, responsive launch services for the growing small satellite constellation market.',
    ceo: 'Masakazu Toyoda',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'solid-fuel', 'japanese-space', 'rapid-launch', 'corporate-backed'],
    tier: 3,
    status: 'active',
    totalFunding: 120000000,
    ownershipType: 'joint-venture',
    parentCompany: 'Canon Electronics / IHI Aerospace JV',
    products: [
      {
        name: 'KAIROS',
        category: 'Launch Vehicle',
        description: 'Four-stage solid-propellant small satellite launcher designed for rapid-response orbital delivery. Capable of launching within days of customer request.',
        status: 'active',
        specs: {
          payloadToLEO: '250 kg',
          payloadToSSO: '150 kg',
          stages: 4,
          fuel: 'Solid propellant',
          height: '18 m',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Masakazu Toyoda',
        title: 'President & CEO',
        role: 'executive',
        bio: 'Leading Space One to develop rapid-response small satellite launch capabilities for the Japanese and international markets.',
      },
    ],
    events: [
      {
        date: '2018-07-01',
        type: 'founding',
        title: 'Space One Founded',
        description: 'Space One was established as a joint venture between Canon Electronics, IHI Aerospace, Shimizu Corporation, and the Development Bank of Japan.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Space One HQ',
        type: 'headquarters',
        city: 'Tokyo',
        country: 'Japan',
      },
      {
        name: 'Kii Space Launch Center',
        type: 'launch-site',
        city: 'Kushimoto',
        state: 'Wakayama',
        country: 'Japan',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },

  // 7. Perigee Aerospace (South Korea)
  {
    name: 'Perigee Aerospace',
    legalName: 'Perigee Aerospace Inc.',
    headquarters: 'Daejeon, South Korea',
    country: 'South Korea',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 90,
    website: 'https://www.perigeeaerospace.com',
    description: 'Perigee Aerospace is a South Korean launch startup developing the Blue Whale small launch vehicle. The company aims to become South Korea\'s first private orbital launch provider with a focus on responsive, affordable access to space.',
    longDescription: 'Perigee Aerospace is developing Blue Whale, a two-stage liquid-fueled rocket designed to carry small satellites into low Earth orbit. Based in Daejeon, South Korea\'s technology hub, the company is backed by significant venture capital and has completed engine testing milestones. Perigee is positioning itself to serve the growing Asian small satellite market with competitive pricing and rapid turnaround launch services.',
    ceo: 'Shin Dong-youn',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'korean-space', 'liquid-propulsion', 'responsive-launch', 'asian-market'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 50000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Blue Whale',
        category: 'Launch Vehicle',
        description: 'Two-stage liquid-fueled small orbital launch vehicle targeting 100-200 kg payloads to LEO. Designed for the Asian small satellite launch market.',
        status: 'in-development',
        specs: {
          payloadToLEO: '100-200 kg',
          stages: 2,
          fuel: 'Kerosene / Liquid Oxygen',
          type: 'Small Orbital Launch Vehicle',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Shin Dong-youn',
        title: 'CEO & Founder',
        role: 'executive',
        bio: 'Founded Perigee Aerospace to develop South Korea\'s first private orbital launch capability.',
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'Perigee Aerospace Founded',
        description: 'Perigee Aerospace was founded in Daejeon, South Korea, to develop the country\'s first private orbital rocket.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Perigee Aerospace HQ & R&D Center',
        type: 'headquarters',
        city: 'Daejeon',
        country: 'South Korea',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },

  // 8. CAS Space (China)
  {
    name: 'CAS Space',
    legalName: 'CAS Space Technology Co., Ltd.',
    slug: 'cas-space',
    headquarters: 'Guangzhou, China',
    country: 'China',
    foundedYear: 2018,
    employeeRange: '201-500',
    employeeCount: 300,
    website: 'https://www.casspace.com',
    description: 'CAS Space is a Chinese commercial launch company spun out of the Chinese Academy of Sciences. The company has successfully launched its Kinetica-1 (Lijian-1) solid-fuel rocket, one of the most capable small solid launchers in the world.',
    longDescription: 'CAS Space (also known as Zhongke Yuhang) was established by the Chinese Academy of Sciences to commercialize rocket technology. The company developed and successfully flew Kinetica-1 (Lijian-1), a four-stage solid-propellant rocket that achieved orbit on its first flight in 2022, delivering multiple satellites. It is one of the largest solid-fuel rockets developed by a Chinese commercial company, with plans for a larger liquid-fueled follow-on vehicle.',
    ceo: 'Yang Yiqiang',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'solid-fuel', 'chinese-commercial-space', 'cas-spinoff', 'operational'],
    tier: 3,
    status: 'active',
    totalFunding: 150000000,
    ownershipType: 'state-backed',
    parentCompany: 'Chinese Academy of Sciences (affiliate)',
    products: [
      {
        name: 'Kinetica-1 (Lijian-1)',
        category: 'Launch Vehicle',
        description: 'Four-stage solid-propellant orbital launch vehicle. Successfully reached orbit on maiden flight in July 2022 delivering 6 satellites. Among the largest Chinese commercial solid rockets.',
        status: 'active',
        specs: {
          payloadToLEO: '1,500 kg',
          payloadToSSO: '1,000 kg',
          stages: 4,
          fuel: 'Solid propellant',
          height: '30 m',
          diameter: '2.65 m',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Yang Yiqiang',
        title: 'CEO',
        role: 'executive',
        bio: 'Leading CAS Space as a spin-off from the Chinese Academy of Sciences, overseeing the Kinetica-1 launch program.',
        previousCompanies: ['Chinese Academy of Sciences'],
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'CAS Space Founded',
        description: 'CAS Space was founded as a commercial launch spin-off of the Chinese Academy of Sciences in Guangzhou.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'CAS Space HQ',
        type: 'headquarters',
        city: 'Guangzhou',
        state: 'Guangdong',
        country: 'China',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },

  // 9. Galactic Energy (China)
  {
    name: 'Galactic Energy',
    legalName: 'Beijing Galactic Energy Technology Co., Ltd.',
    headquarters: 'Beijing, China',
    country: 'China',
    foundedYear: 2018,
    employeeRange: '201-500',
    employeeCount: 350,
    website: 'https://www.galactic-energy.cn',
    description: 'Galactic Energy is a leading Chinese commercial launch company with multiple successful orbital flights of its Ceres-1 solid rocket. The company is developing the larger Pallas-1 kerosene/LOX reusable rocket for medium-lift missions.',
    longDescription: 'Galactic Energy (Yinhe Dongli) has emerged as one of the most successful Chinese commercial launch startups, achieving multiple consecutive successful orbital launches with its Ceres-1 solid-fuel rocket since 2020. The company is now developing Pallas-1, a medium-lift kerosene/LOX rocket with planned reusability, designed to compete with larger vehicles in the growing Chinese commercial launch market. Galactic Energy is one of the best-funded private space companies in China.',
    ceo: 'Liu Baiqi',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'medium-lift', 'chinese-commercial-space', 'reusable', 'kerolox', 'operational'],
    tier: 3,
    status: 'active',
    totalFunding: 250000000,
    lastFundingRound: 'Series D',
    lastFundingDate: '2023-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Ceres-1',
        category: 'Launch Vehicle',
        description: 'Four-stage solid-propellant small launch vehicle with multiple successful orbital flights since 2020. Reliable workhorse for Chinese small satellite launches.',
        status: 'active',
        specs: {
          payloadToLEO: '400 kg',
          payloadToSSO: '300 kg',
          stages: 4,
          fuel: 'Solid propellant (3 stages) + Liquid (upper stage)',
          height: '20 m',
        },
      },
      {
        name: 'Pallas-1',
        category: 'Launch Vehicle',
        description: 'Medium-lift kerosene/LOX launch vehicle under development with planned first-stage reusability. Designed for constellation deployment missions.',
        status: 'in-development',
        specs: {
          payloadToLEO: '5,000 kg',
          stages: 2,
          fuel: 'Kerosene / Liquid Oxygen',
          reusable: true,
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Liu Baiqi',
        title: 'CEO & Co-Founder',
        role: 'executive',
        bio: 'Co-founded Galactic Energy and led the company to become one of the most successful Chinese commercial launch startups.',
      },
    ],
    events: [
      {
        date: '2018-02-01',
        type: 'founding',
        title: 'Galactic Energy Founded',
        description: 'Galactic Energy was founded in Beijing to develop commercial launch vehicles for the Chinese and international markets.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Galactic Energy HQ',
        type: 'headquarters',
        city: 'Beijing',
        country: 'China',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },

  // 10. LandSpace (China)
  {
    name: 'LandSpace',
    legalName: 'LandSpace Technology Co., Ltd.',
    headquarters: 'Beijing, China',
    country: 'China',
    foundedYear: 2015,
    employeeRange: '501-1000',
    employeeCount: 600,
    website: 'https://www.landspace.com',
    description: 'LandSpace is a pioneering Chinese commercial launch company that made history with the Zhuque-2, the world\'s first methane/liquid oxygen rocket to successfully reach orbit. The company is focused on medium-lift reusable launch vehicles.',
    longDescription: 'LandSpace achieved a historic milestone in July 2023 when its Zhuque-2 became the world\'s first methane/LOX-fueled rocket to reach orbit, beating both SpaceX Starship and ULA Vulcan to this achievement. The company is one of the most well-funded Chinese commercial launch startups, with plans to develop a reusable version of Zhuque-2 and scale up production for high-frequency launches serving both domestic and international customers.',
    ceo: 'Zhang Changwu',
    sector: 'launch',
    subsector: 'medium-lift',
    tags: ['medium-lift', 'methalox', 'chinese-commercial-space', 'first-methane-orbit', 'reusable'],
    tier: 3,
    status: 'active',
    totalFunding: 400000000,
    lastFundingRound: 'Series D',
    lastFundingDate: '2023-09-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Zhuque-2',
        category: 'Launch Vehicle',
        description: 'World\'s first methane/LOX rocket to reach orbit (July 2023). Two-stage medium-lift launch vehicle with plans for first-stage reusability.',
        status: 'active',
        specs: {
          payloadToLEO: '6,000 kg',
          payloadToSSO: '4,000 kg',
          stages: 2,
          fuel: 'Methane / Liquid Oxygen',
          height: '49.5 m',
          diameter: '3.35 m',
          thrust: '2,680 kN (sea level)',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Zhang Changwu',
        title: 'CEO & Founder',
        role: 'executive',
        bio: 'Founded LandSpace and led the company to achieve the historic first methane-fueled orbital flight. Former aerospace engineer with experience at Chinese state space programs.',
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'LandSpace Founded',
        description: 'LandSpace was founded in Beijing to develop next-generation commercial launch vehicles using advanced propulsion technology.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'LandSpace HQ',
        type: 'headquarters',
        city: 'Beijing',
        country: 'China',
      },
      {
        name: 'LandSpace Manufacturing & Test Center',
        type: 'manufacturing',
        city: 'Huzhou',
        state: 'Zhejiang',
        country: 'China',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
    ],
  },

  // 11. i-Space (China)
  {
    name: 'i-Space',
    legalName: 'Beijing Interstellar Glory Space Technology Co., Ltd.',
    slug: 'i-space-china',
    headquarters: 'Beijing, China',
    country: 'China',
    foundedYear: 2016,
    employeeRange: '201-500',
    employeeCount: 250,
    website: 'https://www.i-space.com.cn',
    description: 'i-Space (also known as iSpace China or Interstellar Glory) was the first Chinese private company to reach orbit with its Hyperbola-1 rocket in 2019. The company is now developing the reusable Hyperbola-2 (SQX-2) liquid-fueled vehicle.',
    longDescription: 'i-Space made history in July 2019 when its Hyperbola-1 solid-fuel rocket became the first orbital launch vehicle from a Chinese private company to reach space. The company is now developing Hyperbola-2 (SQX-2), a reusable liquid-fueled launch vehicle that has undergone hop tests and is designed to provide lower-cost access to orbit. i-Space is one of the pioneering companies in China\'s rapidly growing commercial launch sector.',
    ceo: 'Peng Xiaobo',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'chinese-commercial-space', 'reusable', 'first-private-chinese-orbit', 'solid-fuel'],
    tier: 3,
    status: 'active',
    totalFunding: 200000000,
    lastFundingRound: 'Series B+',
    lastFundingDate: '2022-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Hyperbola-1 (SQX-1)',
        category: 'Launch Vehicle',
        description: 'Four-stage solid-propellant small launch vehicle. First Chinese private rocket to reach orbit (July 2019). Designed for rapid small satellite deployment.',
        status: 'active',
        specs: {
          payloadToLEO: '300 kg',
          payloadToSSO: '200 kg',
          stages: 4,
          fuel: 'Solid propellant',
          height: '20.8 m',
          diameter: '1.4 m',
        },
      },
      {
        name: 'Hyperbola-2 (SQX-2)',
        category: 'Launch Vehicle',
        description: 'Reusable liquid-fueled medium-lift launch vehicle under development. Features vertical takeoff and landing capability.',
        status: 'in-development',
        specs: {
          payloadToLEO: '1,900 kg',
          stages: 2,
          fuel: 'Liquid (Kerosene/LOX)',
          reusable: true,
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Peng Xiaobo',
        title: 'CEO & Founder',
        role: 'executive',
        bio: 'Founded i-Space and led the team to achieve the first orbital launch by a Chinese private company in 2019.',
      },
    ],
    events: [
      {
        date: '2016-10-01',
        type: 'founding',
        title: 'i-Space Founded',
        description: 'i-Space (Interstellar Glory) was founded in Beijing, becoming one of the earliest Chinese commercial launch startups.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'i-Space HQ',
        type: 'headquarters',
        city: 'Beijing',
        country: 'China',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 52 },
    ],
  },

  // 12. Jiuzhou Yunjian (China)
  {
    name: 'Jiuzhou Yunjian',
    legalName: 'Jiuzhou Yunjian (Beijing) Space Technology Co., Ltd.',
    slug: 'jiuzhou-yunjian',
    headquarters: 'Beijing, China',
    country: 'China',
    foundedYear: 2020,
    employeeRange: '51-200',
    employeeCount: 100,
    website: 'https://www.jiuzhouyunjian.com',
    description: 'Jiuzhou Yunjian is a newer Chinese commercial launch startup developing the Lingyun-3 small launch vehicle. The company is focused on providing low-cost, responsive orbital launch services for the growing Chinese small satellite industry.',
    longDescription: 'Jiuzhou Yunjian is one of the newer entrants in China\'s competitive commercial launch sector. The company is developing the Lingyun-3, a small launch vehicle designed for rapid and affordable deployment of small satellites to low Earth orbit. Backed by Chinese venture capital, the company is working to establish itself in the growing market for dedicated small satellite launch services.',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'chinese-commercial-space', 'responsive-launch', 'startup'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 30000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Lingyun-3',
        category: 'Launch Vehicle',
        description: 'Small orbital launch vehicle under development for dedicated small satellite launch services. Targeting rapid-turnaround, low-cost missions.',
        status: 'in-development',
        specs: {
          payloadToLEO: '200-300 kg',
          type: 'Small Orbital Launch Vehicle',
          fuel: 'Solid propellant',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Jiuzhou Yunjian Leadership',
        title: 'Founding Team',
        role: 'executive',
        bio: 'Founding team with backgrounds in Chinese aerospace and defense industries, leading development of the Lingyun-3 launch vehicle.',
      },
    ],
    events: [
      {
        date: '2020-01-01',
        type: 'founding',
        title: 'Jiuzhou Yunjian Founded',
        description: 'Jiuzhou Yunjian was established in Beijing to develop affordable small satellite launch vehicles for the Chinese commercial market.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Jiuzhou Yunjian HQ',
        type: 'headquarters',
        city: 'Beijing',
        country: 'China',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 30 },
    ],
  },

  // 13. Virgin Orbit (US) - DEFUNCT
  {
    name: 'Virgin Orbit',
    legalName: 'Virgin Orbit Holdings, Inc.',
    slug: 'virgin-orbit',
    ticker: 'VORB',
    exchange: 'NASDAQ (delisted)',
    headquarters: 'Long Beach, California, USA',
    country: 'United States',
    foundedYear: 2017,
    employeeRange: '501-1000',
    employeeCount: 0,
    website: 'https://virginorbit.com',
    description: 'Virgin Orbit was an American small satellite launch company that used an air-launched rocket system called LauncherOne, deployed from a modified Boeing 747 aircraft. The company ceased operations in 2023 after a failed mission and filed for bankruptcy.',
    longDescription: 'Virgin Orbit developed LauncherOne, a two-stage rocket air-launched from a modified Boeing 747-400 named Cosmic Girl. The system successfully delivered satellites to orbit on multiple occasions between 2021 and 2023. However, a January 2023 mission failure during a UK launch attempt led to a financial crisis, and the company filed for Chapter 11 bankruptcy in April 2023. Its assets were subsequently acquired by various buyers including Rocket Lab, Stratolaunch, and others.',
    ceo: 'Dan Hart (former)',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'air-launch', 'defunct', 'bankruptcy', 'virgin-group'],
    tier: 3,
    status: 'defunct',
    isPublic: true,
    totalFunding: 1000000000,
    ownershipType: 'public (delisted)',
    parentCompany: 'Virgin Group (former)',
    products: [
      {
        name: 'LauncherOne',
        category: 'Launch Vehicle',
        description: 'Air-launched two-stage rocket deployed from a modified Boeing 747-400. Delivered multiple small satellite payloads to orbit before company bankruptcy.',
        status: 'retired',
        specs: {
          payloadToLEO: '500 kg',
          payloadToSSO: '300 kg',
          stages: 2,
          fuel: 'RP-1 / Liquid Oxygen',
          launchPlatform: 'Boeing 747-400 "Cosmic Girl"',
          height: '21.3 m',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Dan Hart',
        title: 'Former CEO',
        role: 'executive',
        bio: 'Led Virgin Orbit from 2017 until its bankruptcy in 2023. Former Boeing Satellite Systems executive with decades of aerospace experience.',
        previousCompanies: ['Boeing'],
      },
    ],
    events: [
      {
        date: '2017-01-01',
        type: 'founding',
        title: 'Virgin Orbit Founded',
        description: 'Virgin Orbit was spun off from Virgin Galactic to develop air-launched small satellite launch services.',
        importance: 7,
      },
      {
        date: '2023-04-04',
        type: 'bankruptcy',
        title: 'Virgin Orbit Files for Bankruptcy',
        description: 'Virgin Orbit filed for Chapter 11 bankruptcy protection after a failed UK launch mission in January 2023 led to a financial crisis.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'Virgin Orbit HQ (former)',
        type: 'headquarters',
        city: 'Long Beach',
        state: 'California',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 35 },
    ],
  },

  // 14. Zero 2 Infinity (Spain)
  {
    name: 'Zero 2 Infinity',
    legalName: 'Zero 2 Infinity S.L.',
    slug: 'zero-2-infinity',
    headquarters: 'Barcelona, Spain',
    country: 'Spain',
    foundedYear: 2009,
    employeeRange: '11-50',
    employeeCount: 30,
    website: 'https://www.zero2infinity.space',
    description: 'Zero 2 Infinity is a Spanish aerospace company developing Bloostar, a novel rockoon launch system that uses a stratospheric balloon to lift a rocket to high altitude before ignition, reducing fuel requirements and improving efficiency.',
    longDescription: 'Zero 2 Infinity is pioneering the rockoon concept with its Bloostar system, which uses a high-altitude balloon to carry a rocket to the stratosphere before igniting its engines. This approach significantly reduces the energy needed to reach orbit, potentially offering lower costs for small satellite launches. The company has conducted multiple balloon test flights and is working toward orbital capability. Zero 2 Infinity also offers near-space balloon services for testing and research.',
    ceo: 'Jose Mariano Lopez-Urdiales',
    sector: 'launch',
    subsector: 'micro-launch',
    tags: ['micro-launch', 'rockoon', 'balloon-launch', 'spanish-space', 'novel-architecture'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 15000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2019-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Bloostar',
        category: 'Launch Vehicle',
        description: 'Rockoon launch system using a stratospheric balloon to lift a rocket to ~35 km altitude before orbital ignition. Unique toroidal rocket stage design.',
        status: 'in-development',
        specs: {
          payloadToLEO: '75 kg',
          type: 'Rockoon (Balloon + Rocket)',
          balloonAltitude: '35 km',
          stages: 3,
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Jose Mariano Lopez-Urdiales',
        title: 'CEO & Founder',
        role: 'executive',
        bio: 'Aerospace engineer who founded Zero 2 Infinity to develop balloon-assisted launch systems. Former researcher at MIT and Boeing.',
        previousCompanies: ['MIT', 'Boeing'],
      },
    ],
    events: [
      {
        date: '2009-01-01',
        type: 'founding',
        title: 'Zero 2 Infinity Founded',
        description: 'Zero 2 Infinity was founded in Barcelona to develop innovative balloon-assisted rocket launch technology.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Zero 2 Infinity HQ',
        type: 'headquarters',
        city: 'Barcelona',
        state: 'Catalonia',
        country: 'Spain',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 33 },
    ],
  },

  // 15. TiSPACE (Taiwan)
  {
    name: 'TiSPACE',
    legalName: 'Taiwan Innovative Space Inc.',
    slug: 'tispace',
    headquarters: 'Hsinchu, Taiwan',
    country: 'Taiwan',
    foundedYear: 2016,
    employeeRange: '11-50',
    employeeCount: 40,
    website: 'https://www.tispace.com',
    description: 'TiSPACE is a Taiwanese aerospace startup developing the Hapith series of small hybrid-propulsion launch vehicles. The company aims to become Taiwan\'s first commercial orbital launch provider.',
    longDescription: 'Taiwan Innovative Space (TiSPACE) is developing the Hapith family of rockets using hybrid propulsion technology. The company has conducted sounding rocket tests and is working toward orbital capability with its Hapith V vehicle. Based in Hsinchu, Taiwan\'s technology hub, TiSPACE aims to serve the growing regional demand for dedicated small satellite launch services and establish Taiwan as a participant in the commercial space launch market.',
    ceo: 'Chen Yen-Sen',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'hybrid-propulsion', 'taiwanese-space', 'sounding-rocket', 'regional-launch'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 10000000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2021-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Hapith V',
        category: 'Launch Vehicle',
        description: 'Small hybrid-propulsion launch vehicle targeting dedicated small satellite orbital delivery. Part of the Hapith family of rockets.',
        status: 'in-development',
        specs: {
          payloadToLEO: '50-100 kg',
          fuel: 'Hybrid (Solid fuel / Liquid oxidizer)',
          type: 'Small Orbital Launch Vehicle',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Chen Yen-Sen',
        title: 'CEO & Founder',
        role: 'executive',
        bio: 'Founded TiSPACE to develop Taiwan\'s first commercial launch capability using hybrid propulsion technology.',
      },
    ],
    events: [
      {
        date: '2016-01-01',
        type: 'founding',
        title: 'TiSPACE Founded',
        description: 'Taiwan Innovative Space (TiSPACE) was founded in Hsinchu to develop hybrid-propulsion small launch vehicles for the Taiwanese and regional markets.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'TiSPACE HQ',
        type: 'headquarters',
        city: 'Hsinchu',
        country: 'Taiwan',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 31 },
    ],
  },

  // 16. Ripple Aerospace (Norway)
  {
    name: 'Ripple Aerospace',
    legalName: 'Ripple Aerospace AS',
    headquarters: 'Oslo, Norway',
    country: 'Norway',
    foundedYear: 2019,
    employeeRange: '11-50',
    employeeCount: 20,
    website: 'https://www.ripple-aerospace.com',
    description: 'Ripple Aerospace is a Norwegian startup developing orbital launch vehicles to serve the growing European small satellite market. The company aims to provide dedicated launch services from Norwegian territory.',
    longDescription: 'Ripple Aerospace is working to establish Norway as a launch nation by developing small orbital rockets. The company leverages Norway\'s favorable geography for polar and sun-synchronous orbit launches, and is developing launch vehicle technology with the goal of providing affordable, dedicated launch services for European and international small satellite operators. The company is in early development stages and is part of the broader Nordic space ecosystem.',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'norwegian-space', 'nordic-space', 'polar-launch', 'early-stage'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 5000000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2021-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Ripple Orbital Vehicle',
        category: 'Launch Vehicle',
        description: 'Small orbital launch vehicle under early development, designed for polar and sun-synchronous orbit missions from Norwegian launch sites.',
        status: 'in-development',
        specs: {
          type: 'Small Orbital Launch Vehicle',
          targetOrbit: 'Polar / SSO',
          launchLocation: 'Norway',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Ripple Aerospace Founding Team',
        title: 'Founders',
        role: 'executive',
        bio: 'Founding team of aerospace engineers working to establish Norway\'s first commercial orbital launch capability.',
      },
    ],
    events: [
      {
        date: '2019-01-01',
        type: 'founding',
        title: 'Ripple Aerospace Founded',
        description: 'Ripple Aerospace was founded in Oslo, Norway, to develop orbital launch vehicles leveraging Norway\'s polar launch geography.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Ripple Aerospace HQ',
        type: 'headquarters',
        city: 'Oslo',
        country: 'Norway',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 30 },
    ],
  },

  // 17. Pangea Aerospace (Spain)
  {
    name: 'Pangea Aerospace',
    legalName: 'Pangea Aerospace S.L.',
    headquarters: 'Barcelona, Spain',
    country: 'Spain',
    foundedYear: 2018,
    employeeRange: '11-50',
    employeeCount: 25,
    website: 'https://www.pangeaaerospace.com',
    description: 'Pangea Aerospace is a Spanish startup developing the MESO small launch vehicle featuring an innovative aerospike engine, which promises higher efficiency across a wide range of altitudes compared to conventional bell nozzles.',
    longDescription: 'Pangea Aerospace is pushing the boundaries of propulsion technology with its development of aerospike engines for the MESO small launch vehicle. Aerospike engines are altitude-compensating, meaning they maintain higher efficiency throughout the flight than traditional bell nozzles, which are optimized for a single altitude. Based in Barcelona, the company has conducted hot-fire tests of its aerospike engine and is working toward integrating the technology into a complete launch vehicle for the European small satellite market.',
    ceo: 'Adriano Gonzalez',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['small-lift', 'aerospike-engine', 'spanish-space', 'advanced-propulsion', 'european-launch'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 8000000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2022-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'MESO',
        category: 'Launch Vehicle',
        description: 'Small launch vehicle featuring a proprietary aerospike engine for altitude-compensating efficiency. Designed to deliver small satellites to LEO and SSO.',
        status: 'in-development',
        specs: {
          payloadToLEO: '150-200 kg',
          engineType: 'Aerospike',
          fuel: 'Kerosene / Liquid Oxygen',
          type: 'Small Orbital Launch Vehicle',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Adriano Gonzalez',
        title: 'CEO & Co-Founder',
        role: 'executive',
        bio: 'Co-founded Pangea Aerospace to develop aerospike-powered launch vehicles. Background in aerospace propulsion engineering.',
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'Pangea Aerospace Founded',
        description: 'Pangea Aerospace was founded in Barcelona to develop small launch vehicles with innovative aerospike propulsion technology.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Pangea Aerospace HQ',
        type: 'headquarters',
        city: 'Barcelona',
        state: 'Catalonia',
        country: 'Spain',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 35 },
    ],
  },

  // 18. Latitude (formerly Venture Orbital Systems) (France)
  {
    name: 'Latitude',
    legalName: 'Latitude SAS',
    slug: 'latitude-launch',
    headquarters: 'Reims, France',
    country: 'France',
    foundedYear: 2019,
    employeeRange: '51-200',
    employeeCount: 70,
    website: 'https://www.latitude.eu',
    description: 'Latitude (formerly Venture Orbital Systems) is a French micro-launch company developing the Zephyr rocket, designed to provide affordable dedicated launch services for small satellites from European soil.',
    longDescription: 'Latitude, previously known as Venture Orbital Systems, is developing Zephyr, a three-stage micro-launch vehicle designed to deliver small satellites to sun-synchronous and polar orbits. Based in Reims, France, the company has completed engine testing and is working toward first launch. Latitude is part of the growing European micro-launch ecosystem and aims to provide sovereign European access to space for small satellite operators, reducing dependence on non-European launch providers.',
    ceo: 'Stanislas Maximin',
    sector: 'launch',
    subsector: 'micro-launch',
    tags: ['micro-launch', 'french-space', 'european-launch', 'sovereign-access', 'dedicated-launch'],
    tier: 3,
    status: 'pre-revenue',
    totalFunding: 30000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Zephyr',
        category: 'Launch Vehicle',
        description: 'Three-stage micro-launch vehicle designed for dedicated small satellite delivery to SSO and polar orbits. Hybrid propulsion system.',
        status: 'in-development',
        specs: {
          payloadToSSO: '150 kg',
          stages: 3,
          fuel: 'Hybrid propulsion',
          height: '18 m',
          type: 'Micro Launch Vehicle',
        },
      },
    ],
    keyPersonnel: [
      {
        name: 'Stanislas Maximin',
        title: 'CEO & Co-Founder',
        role: 'executive',
        bio: 'Co-founded Venture Orbital Systems (now Latitude) to develop affordable European micro-launch services. Aerospace engineering background.',
      },
    ],
    events: [
      {
        date: '2019-01-01',
        type: 'founding',
        title: 'Venture Orbital Systems Founded (now Latitude)',
        description: 'Venture Orbital Systems (later renamed Latitude) was founded in Reims, France, to develop the Zephyr micro-launch vehicle for the European market.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Latitude HQ & Development Center',
        type: 'headquarters',
        city: 'Reims',
        state: 'Grand Est',
        country: 'France',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main — additive batch (does NOT delete existing data)
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀 Seeding Batch 1: Additional Launch Providers...\n');

  for (const company of COMPANIES) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }

  const total = await prisma.companyProfile.count();
  console.log(`\n✅ Batch 1 done! Total company profiles: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
