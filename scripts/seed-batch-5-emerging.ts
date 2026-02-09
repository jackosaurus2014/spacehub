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
  fundingRounds?: Array<{ date: string; amount?: number; seriesLabel?: string; roundType?: string; leadInvestor?: string; investors?: string[]; postValuation?: number; }>;
  products?: Array<{ name: string; category?: string; description?: string; status?: string; specs?: Record<string, unknown>; }>;
  keyPersonnel?: Array<{ name: string; title: string; role?: string; linkedinUrl?: string; bio?: string; previousCompanies?: string[]; }>;
  events?: Array<{ date: string; type: string; title: string; description?: string; importance?: number; }>;
  facilities?: Array<{ name: string; type: string; city?: string; state?: string; country: string; }>;
  contracts?: Array<{ agency: string; title: string; description?: string; awardDate?: string; value?: number; ceiling?: number; }>;
  revenueEstimates?: Array<{ year: number; quarter?: number; revenue?: number; revenueRange?: string; source?: string; confidenceLevel?: string; }>;
  scores?: Array<{ scoreType: string; score: number; }>;
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

// ─────────────────────────────────────────────
// High-Growth & Emerging (22 companies)
// ─────────────────────────────────────────────

const EMERGING: CompanyData[] = [
  {
    name: 'Space Forge',
    legalName: 'Space Forge Ltd',
    headquarters: 'Cardiff, Wales',
    country: 'United Kingdom',
    foundedYear: 2018,
    employeeRange: '11-50',
    employeeCount: 45,
    website: 'https://spaceforge.co.uk',
    description: 'Space Forge manufactures advanced materials in microgravity, focusing on semiconductor and alloy production aboard returnable ForgeStar satellites that re-enter Earth for product retrieval.',
    longDescription: 'Space Forge is a Welsh startup pioneering in-space manufacturing. Their ForgeStar platform is a returnable satellite designed to produce super-materials in microgravity, including high-purity semiconductors, specialty alloys, and fiber optics. The company leverages the unique vacuum and zero-gravity conditions of low Earth orbit to create products with properties unattainable on Earth. Their satellites are designed to be reusable, returning to Earth via controlled re-entry with manufactured goods before being refurbished and relaunched.',
    ceo: 'Joshua Western',
    cto: 'Andrew Sheratt',
    sector: 'manufacturing',
    subsector: 'in-space-manufacturing',
    tags: ['in-space-manufacturing', 'semiconductors', 'microgravity', 'returnable-satellite', 'advanced-materials'],
    tier: 3,
    totalFunding: 12_400_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2022-09-01',
    ownershipType: 'private',
    products: [
      {
        name: 'ForgeStar',
        category: 'Satellite Platform',
        description: 'Returnable satellite for in-space manufacturing of semiconductors and advanced alloys in microgravity conditions.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Joshua Western',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Co-founded Space Forge to bring in-space manufacturing to commercial reality, with background in aerospace engineering.',
        previousCompanies: ['Airbus Defence and Space'],
      },
    ],
    events: [
      {
        date: '2023-01-09',
        type: 'launch',
        title: 'ForgeStar-0 Launch on Virgin Orbit',
        description: 'First ForgeStar demonstrator launched aboard Virgin Orbit LauncherOne mission (mission failed to reach orbit).',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 82 },
    ],
  },
  {
    name: 'AstroForge',
    legalName: 'AstroForge Inc.',
    headquarters: 'Huntington Beach, California',
    country: 'United States',
    foundedYear: 2022,
    employeeRange: '11-50',
    employeeCount: 30,
    website: 'https://www.astroforge.io',
    description: 'AstroForge is developing the technology to mine asteroids for platinum-group metals, with plans for refinery missions that process material in space before returning valuable metals to Earth.',
    longDescription: 'AstroForge is an asteroid mining startup aiming to make off-Earth resource extraction commercially viable. The company is developing spacecraft capable of rendezvousing with near-Earth asteroids, extracting platinum-group metals, and refining them in orbit before returning refined material to Earth. Their phased approach begins with technology demonstration missions followed by prospecting and ultimately full-scale mining operations. AstroForge has already flown its first test payload to demonstrate ore-refining processes in microgravity.',
    ceo: 'Matt Gialich',
    cto: 'Jose Acain',
    sector: 'mining',
    subsector: 'asteroid-mining',
    tags: ['asteroid-mining', 'platinum-group-metals', 'space-resources', 'refinery', 'deep-space'],
    tier: 3,
    totalFunding: 55_100_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2024-02-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Odin',
        category: 'Spacecraft',
        description: 'Asteroid flyby and prospecting spacecraft designed to survey near-Earth asteroids for mining viability.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Matt Gialich',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Former Virgin Orbit engineer who co-founded AstroForge to make asteroid mining a commercial reality.',
        previousCompanies: ['Virgin Orbit', 'Bird'],
      },
    ],
    events: [
      {
        date: '2023-04-15',
        type: 'launch',
        title: 'First In-Space Refining Test',
        description: 'AstroForge launched its first payload aboard a SpaceX Transporter mission to demonstrate asteroid ore refining in microgravity.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 85 },
    ],
  },
  {
    name: 'TransAstra',
    legalName: 'TransAstra Corporation',
    headquarters: 'Lake View Terrace, California',
    country: 'United States',
    foundedYear: 2015,
    employeeRange: '11-50',
    employeeCount: 40,
    website: 'https://www.transastracorp.com',
    description: 'TransAstra develops technologies for asteroid mining and orbital debris capture using optical mining (concentrated sunlight) and inflatable capture systems for sustainable space resource utilization.',
    longDescription: 'TransAstra Corporation is developing breakthrough technologies for harvesting resources from asteroids and managing orbital debris. Their patented Optical Mining technique uses concentrated sunlight to excavate and process asteroid material, extracting water and metals without traditional drilling. The company also develops the Worker Bee orbital transfer vehicle and capture bag systems for debris remediation. TransAstra has received multiple NASA contracts to advance their technology for in-space resource utilization and debris mitigation.',
    ceo: 'Joel Sercel',
    sector: 'mining',
    subsector: 'asteroid-mining',
    tags: ['asteroid-mining', 'optical-mining', 'debris-capture', 'space-resources', 'ISRU'],
    tier: 3,
    totalFunding: 20_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Worker Bee',
        category: 'Orbital Transfer Vehicle',
        description: 'Solar-thermal propulsion orbital transfer vehicle for asteroid rendezvous and debris capture operations.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Joel Sercel',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Former JPL engineer with decades of experience in advanced propulsion and mission design, inventor of Optical Mining technology.',
        previousCompanies: ['NASA JPL', 'ICS Associates'],
      },
    ],
    events: [
      {
        date: '2023-09-15',
        type: 'contract',
        title: 'NASA SBIR Phase II for Optical Mining',
        description: 'Awarded NASA SBIR Phase II contract to further develop Optical Mining technology for asteroid resource extraction.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 80 },
    ],
  },
  {
    name: 'Interlune',
    legalName: 'Interlune Inc.',
    headquarters: 'Seattle, Washington',
    country: 'United States',
    foundedYear: 2022,
    employeeRange: '11-50',
    employeeCount: 25,
    website: 'https://www.interlune.space',
    description: 'Interlune plans to harvest Helium-3 from the lunar regolith, a rare isotope with potential applications in quantum computing, medical imaging, and fusion energy research.',
    longDescription: 'Interlune is a lunar mining startup founded by former Blue Origin executives. The company is developing the technology and infrastructure to extract Helium-3 from the Moon\'s surface. Helium-3 is an extremely rare isotope on Earth but abundant in lunar regolith, deposited over billions of years by solar wind. The isotope has near-term applications in quantum computing sensors, neutron detection, and medical imaging (lung MRI), with long-term potential as a clean fusion fuel. Interlune plans to deploy robotic harvesters on the lunar surface to collect and return Helium-3 to Earth.',
    ceo: 'Rob Meyerson',
    sector: 'mining',
    subsector: 'lunar-mining',
    tags: ['helium-3', 'lunar-mining', 'lunar-resources', 'ISRU', 'quantum-computing'],
    tier: 3,
    totalFunding: 18_000_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2024-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Helium-3 Lunar Harvester',
        category: 'Mining Equipment',
        description: 'Robotic harvesting system designed to extract Helium-3 from lunar regolith and package it for return to Earth.',
        status: 'concept',
      },
    ],
    keyPersonnel: [
      {
        name: 'Rob Meyerson',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Former President of Blue Origin with over 20 years of aerospace leadership experience, led New Shepard development.',
        previousCompanies: ['Blue Origin', 'Kymeta'],
      },
    ],
    events: [
      {
        date: '2024-03-12',
        type: 'funding',
        title: 'Interlune Raises $18M Seed Round',
        description: 'Closed $18M seed round to advance Helium-3 extraction technology and lunar mission planning.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 78 },
    ],
  },
  {
    name: 'Asteroid Mining Corporation',
    legalName: 'Asteroid Mining Corporation Ltd',
    slug: 'asteroid-mining-corporation',
    headquarters: 'London, England',
    country: 'United Kingdom',
    foundedYear: 2016,
    employeeRange: '1-10',
    employeeCount: 10,
    website: 'https://asteroidminingcorporation.co.uk',
    description: 'Asteroid Mining Corporation is developing space robotic systems for asteroid prospecting and resource extraction, starting with the APS-1 spectroscopy mission for asteroid characterization.',
    longDescription: 'Asteroid Mining Corporation (AMC) is a UK-based company working toward the commercial extraction of resources from asteroids. Their roadmap begins with the Asteroid Prospecting Satellite One (APS-1), a space telescope designed to identify and characterize near-Earth asteroids for their mineral content. AMC is also developing the Scar-E space robotic mining system. The company aims to supply platinum-group metals and water for the growing in-space economy, supporting both terrestrial demand and orbital fuel depots.',
    ceo: 'Mitch Hunter-Scullion',
    sector: 'mining',
    subsector: 'asteroid-mining',
    tags: ['asteroid-mining', 'space-resources', 'prospecting', 'robotics', 'platinum-group-metals'],
    tier: 3,
    totalFunding: 3_000_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2022-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'APS-1 (Asteroid Prospecting Satellite One)',
        category: 'Spacecraft',
        description: 'Space telescope satellite designed to survey and characterize near-Earth asteroids for mining potential using spectroscopic analysis.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Mitch Hunter-Scullion',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Founded AMC while studying at Liverpool Hope University, driven by the vision of making asteroid mining commercially viable.',
      },
    ],
    events: [
      {
        date: '2022-07-01',
        type: 'milestone',
        title: 'UK Space Agency Grant for APS-1',
        description: 'Received UK Space Agency funding to advance the APS-1 asteroid prospecting satellite mission.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 70 },
    ],
  },
  {
    name: 'Star Catcher Industries',
    legalName: 'Star Catcher Industries Inc.',
    headquarters: 'Denver, Colorado',
    country: 'United States',
    foundedYear: 2022,
    employeeRange: '11-50',
    employeeCount: 20,
    website: 'https://starcatcherindustries.com',
    description: 'Star Catcher Industries is building a space-based power beaming infrastructure to deliver solar energy collected in orbit to spacecraft and surface installations via directed energy.',
    longDescription: 'Star Catcher Industries is developing orbital power infrastructure that collects solar energy in space and beams it to customers using directed energy. Their system aims to provide power to spacecraft, lunar surface operations, and eventually terrestrial grids. The concept eliminates the need for large solar arrays or nuclear power systems on individual spacecraft by centralizing power generation in orbit. The company was founded by aerospace veterans and has attracted significant venture funding to develop this enabling infrastructure for the space economy.',
    ceo: 'Chris Scolese',
    sector: 'energy',
    subsector: 'space-solar-power',
    tags: ['space-solar-power', 'power-beaming', 'directed-energy', 'orbital-infrastructure', 'clean-energy'],
    tier: 3,
    totalFunding: 12_200_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2023-10-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Orbital Power Beaming System',
        category: 'Energy Infrastructure',
        description: 'Space-based solar power collection and directed energy beaming system for delivering power to orbital and surface customers.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Chris Scolese',
        title: 'CEO',
        role: 'executive',
        bio: 'Aerospace industry veteran leading the development of space-based power beaming infrastructure.',
      },
    ],
    events: [
      {
        date: '2023-10-15',
        type: 'funding',
        title: 'Seed Round Closed at $12.2M',
        description: 'Closed seed funding round to develop space-based solar power beaming demonstrator hardware.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 79 },
    ],
  },
  {
    name: 'Virtus Solis',
    legalName: 'Virtus Solis Technologies Inc.',
    headquarters: 'Manassas, Virginia',
    country: 'United States',
    foundedYear: 2022,
    employeeRange: '11-50',
    employeeCount: 30,
    website: 'https://virtussolis.com',
    description: 'Virtus Solis is developing modular space solar power satellites that collect energy in GEO and beam it to Earth via microwave, aiming for gigawatt-scale clean energy delivery.',
    longDescription: 'Virtus Solis Technologies is building a modular space-based solar power (SBSP) system that places large solar arrays in geostationary orbit to continuously harvest sunlight and transmit energy to Earth-based rectennas via microwave beaming. Their modular architecture allows incremental deployment, reducing upfront capital requirements compared to traditional monolithic SBSP concepts. The company aims to deliver clean baseload power at scale, potentially supplying gigawatts of renewable energy without the intermittency issues of terrestrial solar and wind.',
    ceo: 'John Bucknell',
    sector: 'energy',
    subsector: 'space-solar-power',
    tags: ['space-solar-power', 'microwave-beaming', 'clean-energy', 'GEO', 'renewable-energy'],
    tier: 3,
    totalFunding: 5_000_000,
    lastFundingRound: 'Pre-Seed',
    lastFundingDate: '2023-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Modular SBSP Satellite',
        category: 'Energy Infrastructure',
        description: 'Modular space-based solar power satellite in GEO that collects solar energy and transmits it to Earth via microwave power beaming.',
        status: 'concept',
      },
    ],
    keyPersonnel: [
      {
        name: 'John Bucknell',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Former Rolls-Royce and SpaceX engineer applying modular design principles to space solar power architecture.',
        previousCompanies: ['SpaceX', 'Rolls-Royce'],
      },
    ],
    events: [
      {
        date: '2023-06-20',
        type: 'funding',
        title: 'Pre-Seed Funding for SBSP Development',
        description: 'Secured pre-seed funding to develop modular space solar power satellite prototypes and ground rectenna designs.',
        importance: 5,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 76 },
    ],
  },
  {
    name: 'Aetherflux',
    legalName: 'Aetherflux Inc.',
    headquarters: 'San Francisco, California',
    country: 'United States',
    foundedYear: 2023,
    employeeRange: '11-50',
    employeeCount: 20,
    website: 'https://aetherflux.com',
    description: 'Aetherflux is building a constellation of solar-powered satellites in LEO that beam energy to ground receivers using infrared lasers, providing on-demand power anywhere on Earth.',
    longDescription: 'Aetherflux is a space energy startup developing a constellation of satellites in low Earth orbit that collect solar energy and beam it to ground-based receivers using shortwave infrared lasers. Unlike GEO-based space solar concepts, their LEO approach enables smaller, less expensive satellites and more focused energy delivery. The system is designed to provide power on demand to remote locations, disaster zones, military forward operating bases, and off-grid installations where traditional power infrastructure is unavailable or impractical.',
    ceo: 'Baiju Bhatt',
    sector: 'energy',
    subsector: 'space-power-beaming',
    tags: ['power-beaming', 'infrared-laser', 'LEO', 'space-solar', 'on-demand-energy'],
    tier: 3,
    totalFunding: 12_500_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2024-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'LEO Power Beaming Constellation',
        category: 'Energy Infrastructure',
        description: 'Low Earth orbit satellite constellation that collects solar energy and delivers it to ground receivers via shortwave infrared laser beaming.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Baiju Bhatt',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Co-founder of Robinhood Markets, now applying entrepreneurial vision to space-based energy infrastructure.',
        previousCompanies: ['Robinhood'],
      },
    ],
    events: [
      {
        date: '2024-06-10',
        type: 'funding',
        title: 'Aetherflux Raises $12.5M Seed',
        description: 'Secured $12.5M seed round to develop LEO-based infrared power beaming satellite prototypes.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 81 },
    ],
  },
  {
    name: 'Reflect Orbital',
    legalName: 'Reflect Orbital Inc.',
    headquarters: 'Tucson, Arizona',
    country: 'United States',
    foundedYear: 2022,
    employeeRange: '1-10',
    employeeCount: 8,
    website: 'https://reflectorbital.com',
    description: 'Reflect Orbital deploys orbital mirrors that redirect sunlight to terrestrial solar farms during early morning and evening hours, extending their productive generation window.',
    longDescription: 'Reflect Orbital is developing a constellation of lightweight orbital mirrors that reflect sunlight onto ground-based solar farms during periods when the sun is below the horizon or at low angles, effectively extending solar generation hours. By bouncing additional sunlight to existing solar infrastructure during dawn, dusk, and potentially nighttime, the company can increase the capacity factor of solar farms without requiring new panel installations. This approach is simpler and less expensive than space-based solar power generation, as it leverages existing terrestrial infrastructure.',
    ceo: 'Ben Nowak',
    sector: 'energy',
    subsector: 'orbital-reflectors',
    tags: ['orbital-mirrors', 'solar-enhancement', 'clean-energy', 'solar-farms', 'space-infrastructure'],
    tier: 3,
    totalFunding: 3_500_000,
    lastFundingRound: 'Pre-Seed',
    lastFundingDate: '2023-08-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Orbital Reflector Constellation',
        category: 'Energy Infrastructure',
        description: 'Constellation of lightweight orbital mirrors that redirect sunlight to terrestrial solar farms to extend generation hours.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Ben Nowak',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Aerospace engineer developing orbital reflector technology to boost terrestrial solar farm output using space-based mirrors.',
      },
    ],
    events: [
      {
        date: '2024-01-15',
        type: 'milestone',
        title: 'First Ground Demonstration of Reflected Sunlight',
        description: 'Successfully demonstrated ground-based prototype of sunlight reflection and targeting system for solar farm enhancement.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 77 },
    ],
  },
  {
    name: 'SpacePharma',
    legalName: 'SpacePharma SA',
    headquarters: 'Couvet, Neuchatel',
    country: 'Switzerland',
    foundedYear: 2012,
    employeeRange: '11-50',
    employeeCount: 35,
    website: 'https://space4p.com',
    description: 'SpacePharma operates miniaturized microgravity lab platforms on the ISS and free-flying satellites, enabling pharmaceutical companies to conduct drug research experiments in space.',
    longDescription: 'SpacePharma designs and operates miniaturized microgravity laboratories for pharmaceutical and biotech research. Their platforms fly aboard the International Space Station and on dedicated free-flying microsatellites, providing automated experiment environments for crystallography, protein studies, and drug formulation research. The company offers end-to-end services from experiment design to in-orbit operation and data return. SpacePharma has conducted experiments for major pharmaceutical companies exploring how microgravity affects drug compound behavior, crystal growth, and biological processes.',
    ceo: 'Yossi Yamin',
    sector: 'pharma',
    subsector: 'microgravity-research',
    tags: ['microgravity', 'pharma', 'drug-research', 'ISS', 'protein-crystallography'],
    tier: 3,
    totalFunding: 15_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2021-12-01',
    ownershipType: 'private',
    products: [
      {
        name: 'DIDO Microgravity Lab',
        category: 'Research Platform',
        description: 'Miniaturized autonomous laboratory module for microgravity pharmaceutical experiments, deployable on ISS or free-flying satellites.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Yossi Yamin',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Entrepreneur with background in miniaturized systems who founded SpacePharma to democratize access to microgravity research.',
      },
    ],
    events: [
      {
        date: '2023-03-15',
        type: 'launch',
        title: 'DIDO-3 Free-Flying Lab Mission',
        description: 'Launched third-generation free-flying microgravity laboratory satellite carrying multiple pharmaceutical research experiments.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 74 },
    ],
  },
  {
    name: 'Lunar Outpost',
    legalName: 'Lunar Outpost Inc.',
    headquarters: 'Golden, Colorado',
    country: 'United States',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.lunaroutpost.com',
    description: 'Lunar Outpost builds the MAPP rover for lunar surface exploration and in-situ resource utilization (ISRU) technology, supporting NASA Artemis and commercial lunar missions.',
    longDescription: 'Lunar Outpost develops autonomous lunar rovers and in-situ resource utilization technology for the Moon. Their flagship Mobile Autonomous Prospecting Platform (MAPP) rover is designed to traverse the lunar surface, prospecting for water ice and other resources in permanently shadowed craters. The company also builds ISRU systems for extracting and processing lunar materials. Lunar Outpost has contracts with NASA under the Artemis program and is a key partner for commercial lunar payload services, providing mobility solutions for various surface mission architectures.',
    ceo: 'Justin Cyrus',
    sector: 'exploration',
    subsector: 'lunar-rovers',
    tags: ['lunar-rover', 'MAPP', 'ISRU', 'Artemis', 'lunar-prospecting', 'robotics'],
    tier: 3,
    totalFunding: 30_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-09-01',
    ownershipType: 'private',
    products: [
      {
        name: 'MAPP Rover',
        category: 'Lunar Rover',
        description: 'Mobile Autonomous Prospecting Platform for lunar surface exploration, resource prospecting, and ISRU technology demonstration.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Justin Cyrus',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Founded Lunar Outpost from the Colorado School of Mines to develop autonomous systems for lunar resource utilization.',
        previousCompanies: ['Colorado School of Mines'],
      },
    ],
    events: [
      {
        date: '2023-11-01',
        type: 'contract',
        title: 'NASA CLPS Rover Delivery Contract',
        description: 'Selected to provide MAPP rover for NASA Commercial Lunar Payload Services mission to prospect for water ice at the lunar south pole.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 80 },
    ],
  },
  {
    name: 'OffWorld',
    legalName: 'OffWorld Inc.',
    headquarters: 'Pasadena, California',
    country: 'United States',
    foundedYear: 2016,
    employeeRange: '11-50',
    employeeCount: 30,
    website: 'https://www.offworld.ai',
    description: 'OffWorld develops autonomous industrial robots powered by machine learning for mining and construction operations on the Moon, Mars, and asteroids, with terrestrial mining applications.',
    longDescription: 'OffWorld is building a species of autonomous industrial robots designed to perform mining, construction, and manufacturing tasks on the Moon, Mars, and asteroids. Their robots use swarm intelligence and reinforcement learning to operate in unknown environments without human supervision. The company starts with terrestrial mining applications to validate and refine their technology before deploying in space. OffWorld envisions fleets of specialized robots that can excavate regolith, process materials, build structures, and support permanent human settlements beyond Earth.',
    ceo: 'Jim Keravala',
    sector: 'robotics',
    subsector: 'space-mining-robots',
    tags: ['autonomous-robots', 'mining-robots', 'AI', 'swarm-intelligence', 'Moon', 'Mars'],
    tier: 3,
    totalFunding: 10_000_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2021-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'OffWorld Robot Platform',
        category: 'Autonomous Robotics',
        description: 'AI-powered autonomous mining and construction robot designed for operation on lunar and planetary surfaces using swarm intelligence.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Jim Keravala',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Space industry veteran and co-founder of OffWorld, focused on autonomous robotic systems for extraterrestrial resource utilization.',
        previousCompanies: ['Shackleton Energy Company'],
      },
    ],
    events: [
      {
        date: '2022-05-01',
        type: 'milestone',
        title: 'Terrestrial Mining Robot Field Trial',
        description: 'Conducted first autonomous mining robot field trials at terrestrial test site to validate AI-driven excavation algorithms.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 75 },
    ],
  },
  {
    name: 'Neuraspace',
    legalName: 'Neuraspace SA',
    headquarters: 'Lisbon, Portugal',
    country: 'Portugal',
    foundedYear: 2020,
    employeeRange: '11-50',
    employeeCount: 40,
    website: 'https://www.neuraspace.com',
    description: 'Neuraspace provides AI-powered space traffic management and collision avoidance services, helping satellite operators navigate an increasingly congested orbital environment.',
    longDescription: 'Neuraspace is a Portuguese space-tech company developing an AI-driven platform for space traffic management (STM). Their software fuses data from multiple sources including radar, optical telescopes, and space surveillance networks to provide real-time orbital awareness and automated collision avoidance recommendations. The platform uses machine learning to improve conjunction assessment accuracy and reduce false alarm rates, helping satellite operators make faster and more informed maneuver decisions. Neuraspace aims to become a critical infrastructure provider for safe and sustainable space operations.',
    ceo: 'Chiara Manfletti',
    sector: 'software',
    subsector: 'space-traffic-management',
    tags: ['space-traffic-management', 'AI', 'collision-avoidance', 'SSA', 'orbital-safety'],
    tier: 3,
    totalFunding: 10_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-11-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Neuraspace STM Platform',
        category: 'Software Platform',
        description: 'AI-powered space traffic management platform providing real-time collision avoidance and orbital awareness for satellite operators.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Chiara Manfletti',
        title: 'CEO',
        role: 'executive',
        bio: 'Former President of the Portuguese Space Agency and ESA policy advisor, bringing deep institutional space knowledge to commercial STM.',
        previousCompanies: ['Portuguese Space Agency', 'ESA'],
      },
    ],
    events: [
      {
        date: '2023-11-15',
        type: 'funding',
        title: 'Series A for STM Platform Expansion',
        description: 'Raised Series A funding to expand AI-powered space traffic management platform and grow customer base of satellite operators.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 78 },
    ],
  },
  {
    name: 'Morpheus Space',
    legalName: 'Morpheus Space GmbH',
    headquarters: 'Dresden, Germany / Los Angeles, California',
    country: 'Germany',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.morpheus-space.com',
    description: 'Morpheus Space develops scalable electric propulsion systems for smallsats and CubeSats, enabling precise in-orbit maneuvering, constellation management, and end-of-life deorbiting.',
    longDescription: 'Morpheus Space is a German-American company that builds miniaturized electric propulsion systems for small satellites. Their product line ranges from nano-thruster modules for CubeSats to higher-thrust systems for microsatellites, all based on their proprietary ion electrospray technology. The systems enable satellite operators to perform orbit raising, station-keeping, constellation phasing, collision avoidance, and controlled deorbiting. Morpheus Space was spun out of TU Dresden and has rapidly grown to serve commercial constellation operators, government agencies, and academic missions worldwide.',
    ceo: 'Daniel Bock',
    cto: 'Istvan Loerincz',
    sector: 'propulsion',
    subsector: 'electric-propulsion',
    tags: ['electric-propulsion', 'smallsat', 'ion-thruster', 'CubeSat', 'in-orbit-maneuvering'],
    tier: 3,
    totalFunding: 28_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'nanoFEEP Thruster',
        category: 'Electric Propulsion',
        description: 'Miniaturized field emission electric propulsion (FEEP) thruster for CubeSats and smallsats, providing precise attitude control and orbit maneuvering.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Daniel Bock',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Co-founded Morpheus Space from TU Dresden research, scaling ion electrospray propulsion for the smallsat market.',
        previousCompanies: ['TU Dresden'],
      },
    ],
    events: [
      {
        date: '2023-03-20',
        type: 'funding',
        title: 'Series A Funding for Production Scale-Up',
        description: 'Closed $28M Series A to scale production of electric propulsion systems and expand Los Angeles manufacturing facility.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 79 },
    ],
  },
  {
    name: 'Exotrail',
    legalName: 'Exotrail SAS',
    headquarters: 'Massy, Ile-de-France',
    country: 'France',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 100,
    website: 'https://www.exotrail.com',
    description: 'Exotrail provides Hall-effect electric propulsion systems and mission software for smallsats, enabling orbit transfers, constellation deployment, and end-of-life deorbiting.',
    longDescription: 'Exotrail is a French space mobility company offering integrated electric propulsion hardware and mission design software for small satellite operators. Their ExoMG product line features compact Hall-effect thrusters scalable from microsatellites to larger platforms. Complementing the hardware, their SpaceVan orbital transfer vehicle and ExoOPS mission planning software provide complete mobility solutions. Exotrail enables constellation operators to deploy satellites to their operational orbits more efficiently, perform station-keeping, and execute responsible deorbiting at end of life.',
    ceo: 'David Henri',
    sector: 'propulsion',
    subsector: 'electric-propulsion',
    tags: ['electric-propulsion', 'Hall-effect-thruster', 'smallsat', 'orbital-transfer', 'mission-software'],
    tier: 3,
    totalFunding: 60_000_000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-07-01',
    ownershipType: 'private',
    products: [
      {
        name: 'ExoMG Hall-Effect Thruster',
        category: 'Electric Propulsion',
        description: 'Compact, scalable Hall-effect electric propulsion system for smallsats providing efficient orbit raising, station-keeping, and deorbiting.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'David Henri',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Co-founded Exotrail from Ecole Polytechnique, building integrated propulsion and mobility solutions for the smallsat industry.',
        previousCompanies: ['Ecole Polytechnique'],
      },
    ],
    events: [
      {
        date: '2023-07-10',
        type: 'funding',
        title: 'Series B Raised for ExoMG Production',
        description: 'Closed Series B funding round to scale ExoMG thruster production and expand SpaceVan orbital transfer vehicle program.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 77 },
    ],
  },
  {
    name: 'Scout Space',
    legalName: 'Scout Space Inc.',
    headquarters: 'McLean, Virginia',
    country: 'United States',
    foundedYear: 2019,
    employeeRange: '11-50',
    employeeCount: 25,
    website: 'https://www.scoutspace.io',
    description: 'Scout Space deploys in-orbit optical sensors on host satellites to provide close-range space domain awareness and surveillance of resident space objects.',
    longDescription: 'Scout Space is developing a distributed network of optical sensors hosted on commercial satellites to provide real-time space domain awareness (SDA) from orbit. Unlike ground-based tracking, their approach places sensors directly in space for close-range characterization of resident space objects. The Scout Owl sensor payload can identify, track, and characterize objects in its orbital neighborhood, providing data on satellite behavior, proximity operations, and anomalous activities. The company serves both commercial satellite operators and government defense customers.',
    ceo: 'Craig Clark',
    sector: 'ssa',
    subsector: 'space-surveillance',
    tags: ['space-domain-awareness', 'in-orbit-sensors', 'surveillance', 'optical-sensors', 'SSA'],
    tier: 3,
    totalFunding: 8_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-05-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Scout Owl',
        category: 'Sensor Payload',
        description: 'Hosted optical sensor payload for in-orbit space domain awareness, providing close-range tracking and characterization of resident space objects.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Craig Clark',
        title: 'CEO',
        role: 'executive',
        bio: 'Space domain awareness specialist leading Scout Space to deploy in-orbit SDA sensor networks on commercial host satellites.',
      },
    ],
    events: [
      {
        date: '2023-06-01',
        type: 'launch',
        title: 'First Scout Owl Sensor Deployed on Host Satellite',
        description: 'Deployed first Scout Owl optical sensor on a commercial host satellite to begin in-orbit space domain awareness data collection.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 76 },
    ],
  },
  {
    name: 'Orbital Sidekick',
    legalName: 'Orbital Sidekick Inc.',
    headquarters: 'San Francisco, California',
    country: 'United States',
    foundedYear: 2016,
    employeeRange: '11-50',
    employeeCount: 45,
    website: 'https://www.orbitalsidekick.com',
    description: 'Orbital Sidekick operates a constellation of hyperspectral imaging satellites for monitoring greenhouse gas emissions, pipeline leaks, and environmental changes from space.',
    longDescription: 'Orbital Sidekick is a geospatial intelligence company deploying a constellation of hyperspectral imaging satellites. Their AURORA sensor system captures detailed spectral signatures across hundreds of wavelength bands, enabling detection of methane leaks, CO2 emissions, oil spills, and mineral deposits that conventional multispectral satellites miss. The company serves energy companies, governments, and environmental organizations with actionable intelligence for emissions monitoring, infrastructure integrity, and natural resource management. Their GHOSt (Global Hyperspectral Observation Satellite) constellation provides frequent revisit coverage.',
    ceo: 'Dan Katz',
    sector: 'analytics',
    subsector: 'hyperspectral-imaging',
    tags: ['hyperspectral', 'greenhouse-gas', 'emissions-monitoring', 'earth-observation', 'environmental'],
    tier: 3,
    totalFunding: 30_000_000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-04-01',
    ownershipType: 'private',
    products: [
      {
        name: 'GHOSt Hyperspectral Constellation',
        category: 'Satellite Constellation',
        description: 'Global Hyperspectral Observation Satellite constellation for detecting greenhouse gas emissions, pipeline leaks, and environmental anomalies.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Dan Katz',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Co-founded Orbital Sidekick to bring hyperspectral imaging from orbit to commercial emissions monitoring and environmental intelligence.',
      },
    ],
    events: [
      {
        date: '2023-06-15',
        type: 'launch',
        title: 'GHOSt-3 Satellite Launch',
        description: 'Launched third GHOSt hyperspectral satellite to expand constellation coverage for greenhouse gas monitoring customers.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 78 },
    ],
  },
  {
    name: 'Vyoma',
    legalName: 'Vyoma GmbH',
    headquarters: 'Darmstadt, Germany',
    country: 'Germany',
    foundedYear: 2020,
    employeeRange: '11-50',
    employeeCount: 35,
    website: 'https://www.vyoma.space',
    description: 'Vyoma provides space traffic management services combining ground-based and in-orbit sensor data with AI analytics to help satellite operators avoid collisions.',
    longDescription: 'Vyoma is a German space situational awareness and traffic management company that combines optical observations from its own in-orbit camera systems with ground-based sensor data and AI-driven analytics. Their platform delivers automated conjunction assessments, collision avoidance recommendations, and space object characterization services. Vyoma is deploying a constellation of SSA observation satellites to complement ground-based tracking, providing continuous monitoring of the orbital environment. The company serves commercial constellation operators and government agencies seeking to maintain safe space operations.',
    ceo: 'Luisa Buinhas',
    sector: 'ssa',
    subsector: 'space-traffic-management',
    tags: ['space-traffic-management', 'SSA', 'collision-avoidance', 'AI', 'in-orbit-observation'],
    tier: 3,
    totalFunding: 10_500_000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2023-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Vyoma Space Traffic Management Platform',
        category: 'Software Platform',
        description: 'AI-driven space traffic management platform combining in-orbit and ground-based sensor data for collision avoidance and orbital awareness.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Luisa Buinhas',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Aerospace engineer and entrepreneur who co-founded Vyoma to address the growing space debris and traffic management challenge.',
        previousCompanies: ['ESA', 'Airbus'],
      },
    ],
    events: [
      {
        date: '2023-01-20',
        type: 'funding',
        title: 'Seed Funding for SSA Satellite Development',
        description: 'Raised seed funding to develop in-orbit SSA camera systems and expand space traffic management platform capabilities.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 75 },
    ],
  },
  {
    name: 'Digantara',
    legalName: 'Digantara Research and Technologies Pvt Ltd',
    headquarters: 'Bangalore, Karnataka',
    country: 'India',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 70,
    website: 'https://www.digantara.com',
    description: 'Digantara is building a space domain awareness platform using in-orbit sensors and ground-based observations to track resident space objects and monitor the orbital environment.',
    longDescription: 'Digantara is an Indian space situational awareness (SSA) company developing a comprehensive space domain awareness ecosystem. Their approach combines purpose-built in-orbit sensor satellites with ground-based tracking stations and a proprietary space-map analytics platform. The company tracks objects as small as 10 cm in orbit and provides data services to satellite operators, launch providers, and government agencies. Digantara is one of India\'s leading new-space startups and was among the first private Indian companies approved by ISRO for space operations.',
    ceo: 'Anirudh Sharma',
    sector: 'ssa',
    subsector: 'space-domain-awareness',
    tags: ['space-domain-awareness', 'SSA', 'in-orbit-sensors', 'India', 'space-mapping'],
    tier: 3,
    totalFunding: 16_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-08-01',
    ownershipType: 'private',
    products: [
      {
        name: 'SCOT (Space Climate and Object Tracker)',
        category: 'Sensor Satellite',
        description: 'In-orbit sensor satellite for space domain awareness, tracking resident space objects and monitoring the space environment.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Anirudh Sharma',
        title: 'Co-Founder & CEO',
        role: 'executive',
        bio: 'Co-founded Digantara to build India\'s first private space domain awareness platform, with background in aerospace engineering from IISc Bangalore.',
      },
    ],
    events: [
      {
        date: '2023-08-10',
        type: 'funding',
        title: 'Series A for Space Domain Awareness Constellation',
        description: 'Raised Series A funding to deploy constellation of in-orbit SSA sensors and expand space-map analytics platform.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 76 },
    ],
  },
  {
    name: 'Dhruva Space',
    legalName: 'Dhruva Space Private Limited',
    headquarters: 'Hyderabad, Telangana',
    country: 'India',
    foundedYear: 2012,
    employeeRange: '51-200',
    employeeCount: 100,
    website: 'https://www.dhruvaspace.com',
    description: 'Dhruva Space provides satellite platforms, ground station networks, and launch integration services, serving as a full-stack space infrastructure provider in India.',
    longDescription: 'Dhruva Space is one of India\'s pioneering private space companies, providing end-to-end satellite and ground segment solutions. The company designs and manufactures satellite buses and platforms for various mission profiles, operates a network of ground stations for satellite communication and data relay, and provides launch integration services. Dhruva Space was among the first Indian startups to receive IN-SPACe authorization for commercial space activities. Their product portfolio spans CubeSat platforms to larger satellite buses, serving both domestic and international customers.',
    ceo: 'Sanjay Nekkanti',
    sector: 'infrastructure',
    subsector: 'satellite-platforms',
    tags: ['satellite-platforms', 'ground-stations', 'India', 'space-infrastructure', 'launch-integration'],
    tier: 3,
    totalFunding: 5_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-11-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Dhruva Satellite Bus',
        category: 'Satellite Platform',
        description: 'Modular satellite bus platform supporting CubeSat through microsatellite missions with configurable payloads and ground station integration.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Sanjay Nekkanti',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Pioneer in Indian private space sector, founded Dhruva Space in 2012 as one of the first private satellite companies authorized by ISRO/IN-SPACe.',
      },
    ],
    events: [
      {
        date: '2022-06-30',
        type: 'launch',
        title: 'First Dhruva Satellite Launched on PSLV',
        description: 'Launched first Dhruva Space satellite aboard ISRO PSLV, marking a milestone for Indian private space companies.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 72 },
    ],
  },
  {
    name: 'Spacety',
    legalName: 'Spacety Co., Ltd.',
    headquarters: 'Changsha, Hunan',
    country: 'China',
    foundedYear: 2016,
    employeeRange: '201-500',
    employeeCount: 300,
    website: 'https://www.spacety.com',
    description: 'Spacety designs and operates a constellation of SAR (Synthetic Aperture Radar) microsatellites providing all-weather, day-and-night Earth observation imagery.',
    longDescription: 'Spacety is a Chinese commercial space company that designs, manufactures, and operates small SAR (Synthetic Aperture Radar) satellites for all-weather, day-and-night Earth observation. Their Hisea-1 and subsequent SAR constellation satellites provide high-resolution radar imagery independent of cloud cover or lighting conditions, serving maritime monitoring, disaster response, agriculture, and infrastructure applications. Spacety also has operations in Luxembourg, establishing a European presence for its SAR data services. The company has launched multiple satellites and is building out a multi-satellite SAR constellation.',
    ceo: 'Yang Feng',
    sector: 'earth-observation',
    subsector: 'SAR-imaging',
    tags: ['SAR', 'synthetic-aperture-radar', 'earth-observation', 'microsatellite', 'China'],
    tier: 3,
    totalFunding: 50_000_000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2022-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Hisea SAR Constellation',
        category: 'Satellite Constellation',
        description: 'Constellation of SAR microsatellites providing all-weather, day-and-night high-resolution radar imagery for maritime, disaster, and infrastructure monitoring.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Yang Feng',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Founded Spacety to bring commercial SAR microsatellite capabilities to the Chinese and international Earth observation markets.',
      },
    ],
    events: [
      {
        date: '2022-04-15',
        type: 'launch',
        title: 'Hisea-2 SAR Satellite Launch',
        description: 'Launched second-generation SAR microsatellite to expand Hisea constellation coverage for all-weather Earth observation.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 74 },
    ],
  },
  {
    name: 'LeoStella',
    legalName: 'LeoStella LLC',
    headquarters: 'Tukwila, Washington',
    country: 'United States',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 120,
    website: 'https://www.leostella.com',
    description: 'LeoStella is a joint venture between Thales Alenia Space and Spaceflight Inc. that designs and manufactures high-performance smallsats for LEO constellations at scale.',
    longDescription: 'LeoStella is a joint venture between Thales Alenia Space and Spaceflight Industries (now BlackSky parent) established to design and mass-produce small satellites for low Earth orbit constellations. Based near Seattle, their production facility is optimized for building satellites at volume with consistent quality, supporting BlackSky\'s constellation as well as third-party customers. LeoStella combines Thales Alenia Space\'s heritage in satellite manufacturing with agile smallsat development practices, producing compact, capable spacecraft for Earth observation, communications, and other LEO mission profiles.',
    ceo: 'Greg Matloff',
    sector: 'manufacturing',
    subsector: 'smallsat-manufacturing',
    tags: ['smallsat', 'satellite-manufacturing', 'LEO-constellation', 'joint-venture', 'mass-production'],
    tier: 3,
    totalFunding: 0,
    ownershipType: 'joint-venture',
    parentCompany: 'Thales Alenia Space / Spaceflight Industries',
    products: [
      {
        name: 'LeoStella Smallsat Bus',
        category: 'Satellite Platform',
        description: 'High-performance smallsat platform designed for mass production, supporting Earth observation and communication payloads in LEO constellations.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Greg Matloff',
        title: 'President',
        role: 'executive',
        bio: 'Leads LeoStella joint venture operations, overseeing satellite production for BlackSky and third-party constellation customers.',
      },
    ],
    events: [
      {
        date: '2023-09-15',
        type: 'milestone',
        title: '20th Satellite Delivered from Production Line',
        description: 'Delivered 20th smallsat from Tukwila production facility, demonstrating serial manufacturing capability for LEO constellations.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 68 },
    ],
  },
];

// ─────────────────────────────────────────────
// International (16 companies)
// ─────────────────────────────────────────────

const INTERNATIONAL: CompanyData[] = [
  {
    name: 'Bayanat',
    legalName: 'Bayanat AI PLC',
    headquarters: 'Abu Dhabi',
    country: 'United Arab Emirates',
    foundedYear: 2022,
    employeeRange: '201-500',
    employeeCount: 300,
    website: 'https://www.bayanat.ai',
    description: 'Bayanat is a UAE-based AI-powered geospatial analytics company providing satellite-derived intelligence solutions for government and commercial customers across the Middle East and beyond.',
    longDescription: 'Bayanat, a G42 company listed on the Abu Dhabi Securities Exchange, specializes in AI-powered geospatial intelligence solutions. The company integrates satellite imagery, sensor data, and advanced AI/ML algorithms to deliver actionable insights for smart city planning, environmental monitoring, defense, and resource management. Bayanat processes data from multiple satellite constellations and combines it with terrestrial IoT and drone feeds to create comprehensive geospatial intelligence products. As a key part of the UAE\'s growing space and AI ecosystem, Bayanat serves government agencies and commercial enterprises across the MENA region.',
    ticker: 'BAYANAT',
    exchange: 'ADX',
    isPublic: true,
    ceo: 'Hasan Al Hosani',
    sector: 'analytics',
    subsector: 'geospatial-AI',
    tags: ['geospatial', 'AI', 'analytics', 'UAE', 'satellite-imagery', 'smart-cities'],
    tier: 2,
    marketCap: 3_000_000_000,
    revenueEstimate: 200_000_000,
    ownershipType: 'public',
    parentCompany: 'G42',
    products: [
      {
        name: 'Bayanat Geospatial Intelligence Platform',
        category: 'Analytics Platform',
        description: 'AI-powered geospatial analytics platform integrating satellite, drone, and IoT data for smart city planning, defense, and environmental monitoring.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Hasan Al Hosani',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Bayanat in delivering AI-powered geospatial intelligence across the UAE and MENA region, backed by G42 AI capabilities.',
      },
    ],
    events: [
      {
        date: '2022-09-01',
        type: 'ipo',
        title: 'Bayanat IPO on Abu Dhabi Securities Exchange',
        description: 'Listed on the Abu Dhabi Securities Exchange as part of the UAE\'s growing space and AI technology ecosystem.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 72 },
    ],
  },
  {
    name: 'TASI Group',
    legalName: 'Technology & Advanced Systems International Group',
    slug: 'tasi-group',
    headquarters: 'Riyadh',
    country: 'Saudi Arabia',
    foundedYear: 2013,
    employeeRange: '201-500',
    employeeCount: 250,
    website: 'https://www.tasi.com.sa',
    description: 'TASI Group is Saudi Arabia\'s national satellite manufacturing and space technology company, supporting the Kingdom\'s Vision 2030 ambitions for indigenous space capabilities.',
    longDescription: 'Technology & Advanced Systems International (TASI) Group is a Saudi-based space and defense technology company focused on building indigenous satellite manufacturing capabilities for the Kingdom of Saudi Arabia. TASI develops satellite platforms, ground systems, and space mission operations as part of Saudi Arabia\'s Vision 2030 initiative to localize space technology. The company works closely with Saudi government agencies and international partners to transfer technology and build a domestic space industrial base. TASI\'s portfolio includes Earth observation, communications, and reconnaissance satellite programs.',
    ceo: 'Adel Al-Toraifi',
    sector: 'manufacturing',
    subsector: 'satellite-manufacturing',
    tags: ['satellite-manufacturing', 'Saudi-Arabia', 'Vision-2030', 'national-capability', 'defense'],
    tier: 3,
    ownershipType: 'government-backed',
    products: [
      {
        name: 'TASI Satellite Platform',
        category: 'Satellite Platform',
        description: 'Indigenous Saudi satellite manufacturing platform for Earth observation, communications, and reconnaissance missions under Vision 2030.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Adel Al-Toraifi',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads TASI Group in building Saudi Arabia\'s indigenous space manufacturing capabilities as part of Vision 2030.',
      },
    ],
    events: [
      {
        date: '2023-05-01',
        type: 'partnership',
        title: 'Technology Transfer Agreement with International Partner',
        description: 'Signed technology transfer agreement to advance indigenous satellite manufacturing capabilities in Saudi Arabia.',
        importance: 6,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 60 },
    ],
  },
  {
    name: 'Arabsat',
    legalName: 'Arab Satellite Communications Organization',
    headquarters: 'Riyadh',
    country: 'Saudi Arabia',
    foundedYear: 1976,
    employeeRange: '201-500',
    employeeCount: 400,
    website: 'https://www.arabsat.com',
    description: 'Arabsat is the leading Pan-Arab satellite operator providing TV broadcasting, telecommunications, and broadband services across the Middle East and North Africa via a fleet of GEO satellites.',
    longDescription: 'The Arab Satellite Communications Organization (Arabsat) is one of the world\'s top satellite operators and the leading provider of satellite services in the Arab world. Established by the member states of the Arab League, Arabsat operates a fleet of geostationary communication satellites serving over 170 million viewers across the Middle East, Africa, and Europe. The company provides direct-to-home TV broadcasting, telecommunications backbone, broadband internet, and government services. Arabsat\'s BADR satellite series is among the most-watched satellite TV platforms in the MENA region.',
    ceo: 'Khalid Balkheyour',
    sector: 'satellite-operator',
    subsector: 'GEO-communications',
    tags: ['satellite-operator', 'GEO', 'broadcasting', 'telecommunications', 'MENA', 'Pan-Arab'],
    tier: 2,
    revenueEstimate: 400_000_000,
    ownershipType: 'intergovernmental',
    products: [
      {
        name: 'BADR Satellite Series',
        category: 'GEO Satellite Fleet',
        description: 'Fleet of geostationary communication satellites providing DTH TV broadcasting, telecom, and broadband services across the MENA region.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Khalid Balkheyour',
        title: 'CEO',
        role: 'executive',
        bio: 'Longtime Arabsat executive leading the organization\'s satellite operations and expansion across the Arab world.',
      },
    ],
    events: [
      {
        date: '2023-06-01',
        type: 'launch',
        title: 'BADR-8 Satellite Launch',
        description: 'Launched BADR-8 next-generation GEO satellite to expand broadcasting and broadband capacity across the MENA region.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 60 },
    ],
  },
  {
    name: 'Yahsat',
    legalName: 'Al Yah Satellite Communications Company PJSC',
    slug: 'yahsat',
    headquarters: 'Abu Dhabi',
    country: 'United Arab Emirates',
    foundedYear: 2007,
    employeeRange: '501-1000',
    employeeCount: 600,
    website: 'https://www.yahsat.com',
    description: 'Yahsat (Al Yah Satellite Communications) is a UAE-based GEO satellite operator providing managed broadband, government satellite services, and data solutions across the Middle East, Africa, and Asia.',
    longDescription: 'Al Yah Satellite Communications Company (Yahsat) is a publicly listed UAE-based satellite solutions provider. The company operates a fleet of Al Yah geostationary satellites delivering broadband, government communications, and managed satellite services to customers across the Middle East, Africa, Central and South West Asia, and beyond. Yahsat\'s subsidiary YahClick provides Ka-band broadband internet to underserved regions, while its government solutions arm serves the UAE Armed Forces and allied nations. Listed on the Abu Dhabi Securities Exchange, Yahsat is a key component of the UAE\'s space ecosystem.',
    ticker: 'YAHSAT',
    exchange: 'ADX',
    isPublic: true,
    ceo: 'Ali Al Hashemi',
    sector: 'satellite-operator',
    subsector: 'GEO-broadband',
    tags: ['satellite-operator', 'GEO', 'broadband', 'government-services', 'UAE', 'YahClick'],
    tier: 2,
    marketCap: 4_200_000_000,
    revenueEstimate: 450_000_000,
    ownershipType: 'public',
    parentCompany: 'Mubadala Investment Company',
    products: [
      {
        name: 'Al Yah GEO Satellite Fleet',
        category: 'Satellite Fleet',
        description: 'Fleet of Al Yah geostationary satellites providing Ka-band broadband, government communications, and managed services across MENA and Asia.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Ali Al Hashemi',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Yahsat\'s satellite operations and expansion strategy, growing broadband and government services across emerging markets.',
      },
    ],
    events: [
      {
        date: '2023-01-30',
        type: 'partnership',
        title: 'Thuraya Integration Under Yahsat',
        description: 'Completed integration of Thuraya mobile satellite services brand under the Yahsat corporate umbrella to expand service portfolio.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 65 },
    ],
  },
  {
    name: 'MBRSC',
    legalName: 'Mohammed Bin Rashid Space Centre',
    slug: 'mbrsc',
    headquarters: 'Dubai',
    country: 'United Arab Emirates',
    foundedYear: 2006,
    employeeRange: '201-500',
    employeeCount: 350,
    website: 'https://www.mbrsc.ae',
    description: 'MBRSC is the UAE\'s national space agency center responsible for KhalifaSat, the Emirates Mars Mission (Hope Probe), and the upcoming Emirates Lunar Mission.',
    longDescription: 'The Mohammed Bin Rashid Space Centre (MBRSC) is the UAE\'s premier space organization, responsible for the country\'s most ambitious space missions. MBRSC developed and operates KhalifaSat, a high-resolution Earth observation satellite designed and built entirely in the UAE. The centre led the Emirates Mars Mission, successfully placing the Hope Probe into Mars orbit in 2021 to study the Martian atmosphere. MBRSC is also developing the Emirates Lunar Mission (Rashid rover) and training UAE astronauts. The centre is a cornerstone of the UAE\'s strategy to develop a knowledge-based economy and inspire a new generation of scientists and engineers.',
    ceo: 'Salem Al Marri',
    sector: 'government-agency',
    subsector: 'national-space-center',
    tags: ['UAE', 'KhalifaSat', 'Hope-Probe', 'Mars-mission', 'lunar-mission', 'government-agency'],
    tier: 2,
    ownershipType: 'government',
    products: [
      {
        name: 'Hope Probe (Al Amal)',
        category: 'Mars Orbiter',
        description: 'Emirates Mars Mission orbiter studying the Martian atmosphere, weather dynamics, and hydrogen/oxygen escape — first Arab interplanetary mission.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Salem Al Marri',
        title: 'Director General',
        role: 'executive',
        bio: 'Director General of MBRSC overseeing UAE space missions including Hope Probe, KhalifaSat, and the Emirates Lunar Mission.',
      },
    ],
    events: [
      {
        date: '2021-02-09',
        type: 'milestone',
        title: 'Hope Probe Enters Mars Orbit',
        description: 'Emirates Mars Mission Hope Probe successfully entered Mars orbit, making the UAE the fifth entity to reach Mars.',
        importance: 10,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 80 },
    ],
  },
  {
    name: 'Korea Aerospace Industries',
    legalName: 'Korea Aerospace Industries, Ltd.',
    slug: 'korea-aerospace-industries',
    headquarters: 'Sacheon, South Gyeongsang',
    country: 'South Korea',
    foundedYear: 1999,
    employeeRange: '5001-10000',
    employeeCount: 7000,
    website: 'https://www.koreaaero.com',
    description: 'Korea Aerospace Industries (KAI) is South Korea\'s flagship aerospace manufacturer, producing KSLV-II Nuri launch vehicle upper stages, military satellites, and aircraft.',
    longDescription: 'Korea Aerospace Industries (KAI) is the largest aerospace company in South Korea, responsible for developing military aircraft, helicopters, satellites, and space launch vehicle components. KAI produced upper stage and fairing components for the KSLV-II Nuri launch vehicle, South Korea\'s indigenous orbital rocket. The company manufactures the T-50 supersonic trainer, KF-21 Boramae fighter jet, and various military satellite platforms. Listed on the Korea Exchange, KAI is central to South Korea\'s ambitions in both aeronautics and space, supporting national defense and the country\'s growing space program.',
    ticker: '047810',
    exchange: 'KRX',
    isPublic: true,
    ceo: 'Kang Goo-young',
    sector: 'manufacturing',
    subsector: 'aerospace-defense',
    tags: ['aerospace', 'defense', 'launch-vehicle', 'KSLV-II', 'Nuri', 'South-Korea', 'military-satellite'],
    tier: 2,
    marketCap: 8_500_000_000,
    revenueEstimate: 3_200_000_000,
    ownershipType: 'public',
    products: [
      {
        name: 'KSLV-II Nuri Upper Stage',
        category: 'Launch Vehicle Component',
        description: 'Upper stage and fairing components for South Korea\'s Nuri orbital launch vehicle, enabling indigenous satellite launch capability.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Kang Goo-young',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads KAI\'s aerospace and defense operations including military aircraft, satellite, and space launch vehicle programs.',
      },
    ],
    events: [
      {
        date: '2023-05-25',
        type: 'launch',
        title: 'KSLV-II Nuri Third Launch Success',
        description: 'Third Nuri launch vehicle flight successfully deployed commercial satellite, validating South Korea\'s indigenous launch capability.',
        importance: 9,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 68 },
    ],
  },
  {
    name: 'Satrec Initiative',
    legalName: 'Satrec Initiative Co., Ltd.',
    slug: 'satrec-initiative',
    headquarters: 'Daejeon',
    country: 'South Korea',
    foundedYear: 1999,
    employeeRange: '201-500',
    employeeCount: 300,
    website: 'https://www.satreci.com',
    description: 'Satrec Initiative is a South Korean manufacturer of high-resolution Earth observation satellites, exporting satellite systems and optical payload technology worldwide.',
    longDescription: 'Satrec Initiative (SI) is a leading South Korean satellite manufacturer specializing in high-resolution electro-optical Earth observation satellites. The company designs complete satellite systems including spacecraft buses and optical payloads capable of sub-meter resolution imaging. Satrec Initiative has exported satellite systems and technology to multiple countries, including providing KOMPSAT-class satellites and payloads to international customers. The company was spun off from the Korea Aerospace Research Institute (KARI) and has established itself as a competitive global player in the small to medium EO satellite market.',
    ceo: 'Kim Ee-eul',
    sector: 'manufacturing',
    subsector: 'EO-satellite-manufacturing',
    tags: ['satellite-manufacturing', 'earth-observation', 'optical-payload', 'South-Korea', 'export'],
    tier: 3,
    totalFunding: 0,
    revenueEstimate: 80_000_000,
    ownershipType: 'private',
    products: [
      {
        name: 'SpaceEye Series EO Satellite',
        category: 'Earth Observation Satellite',
        description: 'High-resolution electro-optical Earth observation satellite platform with sub-meter imaging capability for domestic and export customers.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Kim Ee-eul',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Satrec Initiative, growing the company\'s international satellite manufacturing and technology export business from its KARI heritage.',
        previousCompanies: ['KARI'],
      },
    ],
    events: [
      {
        date: '2023-04-01',
        type: 'contract',
        title: 'International EO Satellite Export Contract',
        description: 'Signed contract to deliver high-resolution Earth observation satellite system to an international government customer.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 70 },
    ],
  },
  {
    name: 'APT Satellite',
    legalName: 'APT Satellite Holdings Limited',
    slug: 'apt-satellite',
    headquarters: 'Hong Kong',
    country: 'China',
    foundedYear: 1992,
    employeeRange: '51-200',
    employeeCount: 150,
    website: 'https://www.apstar.com',
    description: 'APT Satellite operates the APSTAR fleet of GEO communication satellites, providing broadcasting, broadband, and maritime services across the Asia-Pacific region.',
    longDescription: 'APT Satellite Holdings is a Hong Kong-based satellite operator that owns and operates the APSTAR series of geostationary communication satellites. The company provides transponder leasing, broadcasting, VSAT, maritime communications, and broadband services to customers across the Asia-Pacific region. APT Satellite serves major broadcasters, telecom operators, and enterprise customers with C-band and Ku-band capacity. Listed on the Hong Kong Stock Exchange, the company has been a key satellite communications provider in the region for over three decades, with its fleet covering Asia, Oceania, and parts of Africa.',
    ceo: 'Cheng Guangren',
    sector: 'satellite-operator',
    subsector: 'GEO-communications',
    tags: ['satellite-operator', 'GEO', 'APSTAR', 'broadcasting', 'Asia-Pacific', 'maritime'],
    tier: 3,
    revenueEstimate: 100_000_000,
    ownershipType: 'public',
    isPublic: true,
    products: [
      {
        name: 'APSTAR GEO Satellite Fleet',
        category: 'Satellite Fleet',
        description: 'Fleet of APSTAR geostationary communication satellites providing broadcasting, broadband, and maritime services across Asia-Pacific.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Cheng Guangren',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads APT Satellite\'s operations providing GEO communication services across the Asia-Pacific region via the APSTAR fleet.',
      },
    ],
    events: [
      {
        date: '2022-10-01',
        type: 'launch',
        title: 'APSTAR-6E Satellite Launch',
        description: 'Launched APSTAR-6E high-throughput satellite to expand broadband capacity across Southeast Asia.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 55 },
    ],
  },
  {
    name: 'Embratel Star One',
    legalName: 'Embratel Star One S.A.',
    slug: 'embratel-star-one',
    headquarters: 'Rio de Janeiro',
    country: 'Brazil',
    foundedYear: 2000,
    employeeRange: '201-500',
    employeeCount: 250,
    website: 'https://www.starone.com.br',
    description: 'Embratel Star One is the largest satellite operator in Latin America, operating a fleet of GEO satellites for broadcasting, broadband, and corporate communications across Brazil and the Americas.',
    longDescription: 'Embratel Star One, a subsidiary of Claro (owned by America Movil), is the largest satellite operator in Latin America. The company operates a fleet of geostationary satellites providing C-band and Ku-band services for TV broadcasting, corporate data networks, broadband internet, and government communications across Brazil, Latin America, and parts of North America and Africa. Star One\'s satellite fleet supports major Brazilian broadcasters, telecom carriers, and enterprise customers. The company is also investing in next-generation high-throughput satellite technology to meet growing broadband demand in underserved areas of Brazil.',
    ceo: 'Gustavo Silbert',
    sector: 'satellite-operator',
    subsector: 'GEO-communications',
    tags: ['satellite-operator', 'GEO', 'broadcasting', 'Brazil', 'Latin-America', 'broadband'],
    tier: 3,
    revenueEstimate: 250_000_000,
    ownershipType: 'subsidiary',
    parentCompany: 'America Movil',
    products: [
      {
        name: 'Star One GEO Satellite Fleet',
        category: 'Satellite Fleet',
        description: 'Fleet of GEO communication satellites serving Brazil and Latin America with broadcasting, broadband, and enterprise data services.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Gustavo Silbert',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Embratel Star One as the largest satellite operator in Latin America, expanding broadband and broadcasting services across the region.',
      },
    ],
    events: [
      {
        date: '2023-08-01',
        type: 'launch',
        title: 'Star One D3 Satellite Order',
        description: 'Ordered next-generation high-throughput satellite to expand broadband capacity over Brazil and Latin America.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 55 },
    ],
  },
  {
    name: 'Telebras',
    legalName: 'Telecomunicacoes Brasileiras S.A.',
    slug: 'telebras',
    headquarters: 'Brasilia',
    country: 'Brazil',
    foundedYear: 1972,
    employeeRange: '501-1000',
    employeeCount: 600,
    website: 'https://www.telebras.com.br',
    description: 'Telebras operates the SGDC military/civil dual-use communications satellite providing secure government communications and broadband services across Brazil.',
    longDescription: 'Telecomunicacoes Brasileiras (Telebras) is a Brazilian state-owned telecommunications company that operates the Geostationary Defense and Strategic Communications Satellite (SGDC). The SGDC provides dual-use military and civilian satellite communications, including secure government and military networks and broadband internet for underserved areas of Brazil through the GESAC program. Telebras plays a strategic role in Brazilian national security communications and digital inclusion. The company also manages portions of Brazil\'s fiber optic backbone infrastructure and is planning next-generation satellite systems.',
    isPublic: true,
    ceo: 'Frederico de Siqueira Filho',
    sector: 'satellite-operator',
    subsector: 'government-communications',
    tags: ['satellite-operator', 'government-comms', 'military', 'SGDC', 'Brazil', 'broadband'],
    tier: 3,
    revenueEstimate: 120_000_000,
    ownershipType: 'state-owned',
    products: [
      {
        name: 'SGDC (Geostationary Defense and Strategic Communications Satellite)',
        category: 'GEO Satellite',
        description: 'Dual-use military and civilian GEO communications satellite providing secure government networks and broadband for underserved regions of Brazil.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Frederico de Siqueira Filho',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Telebras in providing secure government satellite communications and broadband inclusion across Brazil via the SGDC system.',
      },
    ],
    events: [
      {
        date: '2023-03-01',
        type: 'contract',
        title: 'SGDC-2 Satellite Development Contract',
        description: 'Awarded contract for development of SGDC-2 next-generation defense and strategic communications satellite for Brazil.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 50 },
    ],
  },
  {
    name: 'Gilat Satellite Networks',
    legalName: 'Gilat Satellite Networks Ltd.',
    slug: 'gilat-satellite-networks',
    headquarters: 'Petah Tikva',
    country: 'Israel',
    foundedYear: 1987,
    employeeRange: '501-1000',
    employeeCount: 800,
    website: 'https://www.gilat.com',
    description: 'Gilat Satellite Networks is a global leader in VSAT ground equipment and satellite networking technology, providing broadband, in-flight connectivity, and defense communication solutions.',
    longDescription: 'Gilat Satellite Networks is an Israeli technology company and a global leader in satellite networking solutions. The company designs and manufactures VSAT (Very Small Aperture Terminal) ground equipment, modems, and network management platforms used by satellite operators, telecom providers, airlines, and defense forces worldwide. Gilat\'s products support broadband access in rural and underserved areas, cellular backhaul, in-flight connectivity (IFC), and military-grade communications. Listed on NASDAQ, Gilat serves customers in over 100 countries and is a key supplier to major satellite broadband programs including OneWeb and SES.',
    ticker: 'GILT',
    exchange: 'NASDAQ',
    isPublic: true,
    ceo: 'Adi Sfadia',
    sector: 'ground-segment',
    subsector: 'VSAT-equipment',
    tags: ['VSAT', 'ground-equipment', 'satellite-networking', 'broadband', 'IFC', 'defense-comms'],
    tier: 2,
    marketCap: 500_000_000,
    revenueEstimate: 300_000_000,
    ownershipType: 'public',
    products: [
      {
        name: 'SkyEdge IV Platform',
        category: 'VSAT Platform',
        description: 'Next-generation multi-service VSAT platform supporting broadband, cellular backhaul, IFC, and defense communications for satellite operators worldwide.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Adi Sfadia',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Gilat Satellite Networks in delivering VSAT and satellite networking solutions to operators and service providers across 100+ countries.',
      },
    ],
    events: [
      {
        date: '2023-09-01',
        type: 'contract',
        title: 'Major IFC Ground Equipment Supply Contract',
        description: 'Secured contract to supply VSAT ground infrastructure for a major in-flight connectivity (IFC) satellite program.',
        importance: 7,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 68 },
    ],
  },
  {
    name: 'SpaceIL',
    legalName: 'SpaceIL',
    slug: 'spaceil',
    headquarters: 'Ramat Gan',
    country: 'Israel',
    foundedYear: 2011,
    employeeRange: '11-50',
    employeeCount: 40,
    website: 'https://www.spaceil.com',
    description: 'SpaceIL is an Israeli non-profit developing the Beresheet lunar lander program, having achieved the first privately funded spacecraft to orbit the Moon.',
    longDescription: 'SpaceIL is an Israeli non-profit organization that developed the Beresheet lunar lander, the first privately funded spacecraft to orbit the Moon. Originally formed to compete in the Google Lunar X Prize, SpaceIL continued its mission after the competition ended. Beresheet launched in February 2019 aboard a SpaceX Falcon 9, successfully entered lunar orbit, but experienced a main engine failure during landing and crashed on the Moon\'s surface. Despite the landing failure, Beresheet demonstrated that a small non-profit could reach the Moon for a fraction of traditional mission costs. SpaceIL is now developing Beresheet 2, a more ambitious follow-up mission.',
    ceo: 'Shimon Sarid',
    sector: 'exploration',
    subsector: 'lunar-lander',
    tags: ['lunar-lander', 'Beresheet', 'non-profit', 'Israel', 'Moon', 'exploration'],
    tier: 3,
    totalFunding: 100_000_000,
    ownershipType: 'non-profit',
    products: [
      {
        name: 'Beresheet 2',
        category: 'Lunar Lander',
        description: 'Follow-up to the original Beresheet mission, aiming to successfully land on the lunar surface and deploy a small rover.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Shimon Sarid',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads SpaceIL in developing the Beresheet 2 lunar lander mission, building on lessons from the first mission\'s flight to the Moon.',
      },
    ],
    events: [
      {
        date: '2019-04-11',
        type: 'milestone',
        title: 'Beresheet Lunar Orbit and Landing Attempt',
        description: 'Beresheet became the first privately funded spacecraft to orbit the Moon; landing attempt narrowly failed due to engine malfunction.',
        importance: 9,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 75 },
    ],
  },
  {
    name: 'Telespazio',
    legalName: 'Telespazio S.p.A.',
    slug: 'telespazio',
    headquarters: 'Rome',
    country: 'Italy',
    foundedYear: 1961,
    employeeRange: '1001-5000',
    employeeCount: 3000,
    website: 'https://www.telespazio.com',
    description: 'Telespazio is a joint venture between Leonardo and Thales providing satellite operations, Earth observation services, navigation, and integrated space-based communications solutions.',
    longDescription: 'Telespazio is one of the world\'s leading space service companies, jointly owned by Leonardo (67%) and Thales (33%). The company provides satellite operations and control, Earth observation data services, navigation and location-based services, satellite communications, and network engineering. Telespazio operates the Fucino Space Centre in Italy, one of the largest civilian satellite control centers in the world. The company manages satellite constellations, provides defense and security satellite services, and delivers geospatial information solutions. With over 60 years of heritage, Telespazio serves government, defense, and commercial customers across five continents.',
    ceo: 'Luigi Pasquali',
    sector: 'services',
    subsector: 'satellite-operations',
    tags: ['satellite-operations', 'earth-observation', 'navigation', 'space-services', 'Italy', 'defense'],
    tier: 2,
    revenueEstimate: 700_000_000,
    ownershipType: 'joint-venture',
    parentCompany: 'Leonardo / Thales',
    products: [
      {
        name: 'Fucino Space Centre Operations',
        category: 'Ground Segment Services',
        description: 'Satellite mission control, constellation management, and ground segment services from one of the world\'s largest civilian space centers.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Luigi Pasquali',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Telespazio as a global space service provider, managing satellite operations and Earth observation services for government and commercial clients.',
      },
    ],
    events: [
      {
        date: '2023-07-01',
        type: 'contract',
        title: 'Copernicus Ground Segment Operations Contract',
        description: 'Awarded contract to provide ground segment operations support for the European Copernicus Earth observation program.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 65 },
    ],
  },
  {
    name: 'exactEarth',
    legalName: 'exactEarth Ltd. (acquired by Spire Global)',
    slug: 'exactearth',
    headquarters: 'Cambridge, Ontario',
    country: 'Canada',
    foundedYear: 2009,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.exactearth.com',
    description: 'exactEarth provided satellite-based AIS maritime vessel tracking services using a constellation of microsatellites before being acquired by Spire Global in 2022.',
    longDescription: 'exactEarth was a Canadian company specializing in satellite-based Automatic Identification System (AIS) data for global maritime vessel tracking and monitoring. The company operated a constellation of microsatellites carrying AIS receivers to detect and track ships worldwide, providing data services to coast guards, navies, port authorities, and shipping companies. exactEarth\'s real-time vessel tracking data was used for maritime domain awareness, port management, fishing compliance, and environmental monitoring. The company was acquired by Spire Global in 2022, with its maritime AIS capabilities integrated into Spire\'s broader data analytics platform.',
    ceo: 'Peter Mabson',
    sector: 'analytics',
    subsector: 'maritime-tracking',
    tags: ['maritime', 'AIS', 'vessel-tracking', 'microsatellite', 'Canada', 'acquired'],
    tier: 3,
    status: 'acquired',
    ownershipType: 'acquired',
    parentCompany: 'Spire Global',
    products: [
      {
        name: 'exactAIS Maritime Tracking Service',
        category: 'Data Service',
        description: 'Satellite-based AIS maritime vessel tracking and monitoring service providing global ship detection and maritime domain awareness.',
        status: 'legacy',
      },
    ],
    keyPersonnel: [
      {
        name: 'Peter Mabson',
        title: 'Former CEO',
        role: 'executive',
        bio: 'Led exactEarth through its growth as a maritime AIS tracking provider until its acquisition by Spire Global in 2022.',
      },
    ],
    events: [
      {
        date: '2022-03-01',
        type: 'acquisition',
        title: 'Acquired by Spire Global',
        description: 'exactEarth acquired by Spire Global, integrating its maritime AIS tracking capabilities into Spire\'s multi-domain data analytics platform.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 60 },
    ],
  },
  {
    name: 'SatixFy',
    legalName: 'SatixFy Communications Ltd.',
    slug: 'satixfy',
    headquarters: 'Rehovot',
    country: 'Israel',
    foundedYear: 2012,
    employeeRange: '201-500',
    employeeCount: 250,
    website: 'https://www.satixfy.com',
    description: 'SatixFy develops space-grade 5G satellite communication chips and digital beamforming ASICs that enable next-generation software-defined satellite payloads and ground terminals.',
    longDescription: 'SatixFy Communications is an Israeli semiconductor company developing advanced satellite communication chips and systems. Their proprietary ASIC chips enable fully digital beamforming for satellite antennas, software-defined satellite payloads, and electronically steered flat-panel ground terminals. SatixFy\'s technology allows satellite operators to dynamically allocate bandwidth and shape beams in real-time, supporting 5G-grade connectivity from space. The company\'s chips power both space-segment payloads and ground-segment terminals, providing an end-to-end silicon solution for next-generation satellite communications. Listed on NYSE, SatixFy serves major satellite operators and defense customers.',
    ticker: 'SATX',
    exchange: 'NYSE',
    isPublic: true,
    ceo: 'Yoel Gat',
    cto: 'David Ripstein',
    sector: 'components',
    subsector: 'satellite-chips',
    tags: ['satellite-chips', 'digital-beamforming', 'ASIC', '5G', 'software-defined', 'Israel'],
    tier: 3,
    marketCap: 150_000_000,
    revenueEstimate: 20_000_000,
    ownershipType: 'public',
    products: [
      {
        name: 'SX3099 Digital Beamforming ASIC',
        category: 'Semiconductor',
        description: 'Space-grade digital beamforming ASIC enabling software-defined satellite payloads with dynamic beam shaping and 5G-grade connectivity.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Yoel Gat',
        title: 'CEO',
        role: 'executive',
        bio: 'Veteran satellite communications executive leading SatixFy in developing next-generation digital beamforming chips for the satellite industry.',
      },
    ],
    events: [
      {
        date: '2023-11-01',
        type: 'milestone',
        title: 'First In-Orbit Digital Beamforming Payload Test',
        description: 'Successfully tested SatixFy digital beamforming payload in orbit, demonstrating software-defined beam shaping capabilities.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 78 },
    ],
  },
  {
    name: 'Sateliot',
    legalName: 'Sateliot SL',
    slug: 'sateliot',
    headquarters: 'Barcelona',
    country: 'Spain',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.sateliot.space',
    description: 'Sateliot is building the first LEO satellite constellation integrated with 5G standards to provide global IoT connectivity using the 3GPP NB-IoT protocol directly from space.',
    longDescription: 'Sateliot is a Spanish company deploying a low Earth orbit satellite constellation designed to extend 5G IoT connectivity globally. Their satellites use the 3GPP NB-IoT standard, making them the first LEO constellation natively integrated with terrestrial 5G networks. This approach allows existing IoT devices to connect to Sateliot satellites without modification, using standard cellular protocols. The company targets agriculture, logistics, environmental monitoring, and smart city applications where terrestrial cellular coverage is unavailable. Sateliot partners with mobile network operators (MNOs) to offer seamless hybrid terrestrial-satellite IoT services, filling connectivity gaps in remote and rural areas.',
    ceo: 'Jaume Sanpera',
    sector: 'satellite-operator',
    subsector: 'IoT-constellation',
    tags: ['IoT', '5G', 'NB-IoT', 'LEO-constellation', 'Spain', 'connectivity'],
    tier: 3,
    totalFunding: 30_000_000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-04-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Sateliot 5G IoT Constellation',
        category: 'Satellite Constellation',
        description: 'LEO satellite constellation providing global NB-IoT 5G connectivity for IoT devices, natively integrated with terrestrial mobile networks.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Jaume Sanpera',
        title: 'CEO',
        role: 'executive',
        bio: 'Telecom veteran leading Sateliot in building the first 5G NB-IoT LEO constellation to extend cellular IoT connectivity to underserved global regions.',
      },
    ],
    events: [
      {
        date: '2023-04-15',
        type: 'launch',
        title: 'First Sateliot Constellation Satellites Launched',
        description: 'Launched initial operational satellites for the 5G NB-IoT LEO constellation, beginning commercial IoT connectivity services.',
        importance: 8,
      },
    ],
    scores: [
      { scoreType: 'innovation', score: 74 },
    ],
  },
];

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('🚀 Seeding Batch 5: Emerging & International Companies...\n');

  console.log('── High-Growth & Emerging ──');
  for (const company of EMERGING) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }

  console.log('\n── International ──');
  for (const company of INTERNATIONAL) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }

  const total = await prisma.companyProfile.count();
  console.log(`\n✅ Batch 5 done! Total company profiles: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
