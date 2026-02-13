import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface EnrichmentData {
  slug: string;
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
  }>;
  keyPersonnel?: Array<{
    name: string;
    title: string;
    role?: string;
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
    methodology?: string;
  }>;
}

async function enrichCompany(data: EnrichmentData) {
  const profile = await prisma.companyProfile.findUnique({
    where: { slug: data.slug },
    select: { id: true, name: true },
  });
  if (!profile) {
    console.log(`  ⚠ Company not found: ${data.slug}`);
    return;
  }

  let added = 0;

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
      }).then(() => { added++; }).catch(() => {});
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
        },
      }).then(() => { added++; }).catch(() => {});
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
          bio: p.bio,
          previousCompanies: p.previousCompanies ?? [],
        },
      }).then(() => { added++; }).catch(() => {});
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
      }).then(() => { added++; }).catch(() => {});
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
      }).then(() => { added++; }).catch(() => {});
    }
  }

  if (data.contracts) {
    for (const c of data.contracts) {
      await prisma.governmentContractAward.create({
        data: {
          companyId: profile.id,
          companyName: profile.name,
          agency: c.agency,
          title: c.title,
          description: c.description,
          awardDate: c.awardDate ? new Date(c.awardDate) : undefined,
          value: c.value,
          ceiling: c.ceiling,
        },
      }).then(() => { added++; }).catch(() => {});
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
      }).then(() => { added++; }).catch(() => {});
    }
  }

  if (data.scores) {
    for (const s of data.scores) {
      await prisma.companyScore.upsert({
        where: { companyId_scoreType: { companyId: profile.id, scoreType: s.scoreType } },
        update: { score: s.score, methodology: s.methodology, calculatedAt: new Date() },
        create: {
          companyId: profile.id,
          scoreType: s.scoreType,
          score: s.score,
          methodology: s.methodology,
        },
      }).then(() => { added++; }).catch(() => {});
    }
  }

  // Recalculate data completeness
  const counts = await (prisma.companyProfile as any).findUnique({
    where: { id: profile.id },
    select: {
      description: true, longDescription: true, totalFunding: true, marketCap: true,
      revenueEstimate: true, ceo: true,
      _count: {
        select: {
          fundingRounds: true, products: true, keyPersonnel: true,
          events: true, contracts: true, facilities: true,
        },
      },
    },
  });
  if (counts) {
    let completeness = 20;
    if (counts.description) completeness += 5;
    if (counts.longDescription) completeness += 5;
    if (counts.totalFunding || counts.marketCap) completeness += 10;
    if (counts.revenueEstimate) completeness += 5;
    if (counts.ceo) completeness += 5;
    if (counts._count.fundingRounds > 0) completeness += 10;
    if (counts._count.products > 0) completeness += 10;
    if (counts._count.keyPersonnel > 0) completeness += 10;
    if (counts._count.events > 0) completeness += 5;
    if (counts._count.contracts > 0) completeness += 5;
    if (counts._count.facilities > 0) completeness += 5;
    completeness = Math.min(completeness, 100);
    await prisma.companyProfile.update({ where: { id: profile.id }, data: { dataCompleteness: completeness } });
  }

  console.log(`  ✓ ${profile.name} (+${added} records)`);
}

// ────────────────────────────────────────────────────────────────
// TIER 2 ENRICHMENTS
// ────────────────────────────────────────────────────────────────

const TIER_2_ENRICHMENTS: EnrichmentData[] = [
  // ── Astroscale ──
  {
    slug: 'astroscale',
    fundingRounds: [
      { date: '2023-10-01', amount: 76000000, seriesLabel: 'Series G', roundType: 'equity', leadInvestor: 'Mitsubishi Electric' },
      { date: '2021-11-01', amount: 109000000, seriesLabel: 'Series F', roundType: 'equity', leadInvestor: 'DNCA Invest' },
      { date: '2020-10-01', amount: 51000000, seriesLabel: 'Series E', roundType: 'equity', leadInvestor: 'Seraphim Capital' },
    ],
    events: [
      { date: '2023-02-01', type: 'milestone', title: 'ADRAS-J launched on Rocket Lab Electron for JAXA debris inspection', importance: 8 },
      { date: '2021-03-22', type: 'milestone', title: 'ELSA-d mission launched — first commercial debris removal demo', importance: 9 },
      { date: '2024-04-01', type: 'milestone', title: 'ADRAS-J completes world-first proximity approach to orbital debris', importance: 9 },
    ],
    facilities: [
      { name: 'Astroscale HQ', type: 'headquarters', city: 'Tokyo', country: 'JP' },
      { name: 'UK Operations', type: 'office', city: 'Harwell', country: 'GB' },
    ],
    contracts: [
      { agency: 'JAXA', title: 'CRD2 Phase I — Active Debris Removal', value: 50000000, awardDate: '2020-03-01' },
      { agency: 'ESA', title: 'Active Debris Removal/In-Orbit Servicing Study', value: 15000000, awardDate: '2022-01-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 82 },
      { scoreType: 'team', score: 70 },
      { scoreType: 'funding', score: 78 },
      { scoreType: 'market_position', score: 75 },
      { scoreType: 'growth', score: 80 },
      { scoreType: 'momentum', score: 85 },
      { scoreType: 'overall', score: 78 },
    ],
  },

  // ── Impulse Space ──
  {
    slug: 'impulse-space',
    fundingRounds: [
      { date: '2024-01-01', amount: 75000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Founders Fund' },
      { date: '2022-11-01', amount: 45000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Lux Capital' },
    ],
    events: [
      { date: '2023-11-01', type: 'milestone', title: 'Mira LEO orbital transfer vehicle completes maiden flight on SpaceX rideshare', importance: 8 },
      { date: '2024-06-01', type: 'funding', title: 'Raises $75M Series B to develop Helios high-energy upper stage', importance: 7 },
    ],
    facilities: [
      { name: 'Impulse Space HQ & Factory', type: 'headquarters', city: 'Redondo Beach', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 80 },
      { scoreType: 'funding', score: 68 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 75 },
      { scoreType: 'momentum', score: 70 },
      { scoreType: 'overall', score: 68 },
    ],
  },

  // ── Muon Space ──
  {
    slug: 'muon-space',
    fundingRounds: [
      { date: '2023-06-01', amount: 56700000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'T. Rowe Price' },
      { date: '2022-03-01', amount: 16000000, seriesLabel: 'Seed', roundType: 'seed', leadInvestor: 'Costanoa Ventures' },
    ],
    keyPersonnel: [
      { name: 'Jonny Dyer', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Planet Labs', 'NASA JPL'] },
    ],
    events: [
      { date: '2023-12-01', type: 'milestone', title: 'First Muon satellite launched to LEO for climate monitoring', importance: 8 },
      { date: '2023-06-01', type: 'funding', title: 'Raises $56.7M Series A led by T. Rowe Price', importance: 7 },
    ],
    facilities: [
      { name: 'Muon Space HQ', type: 'headquarters', city: 'Mountain View', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 68 },
      { scoreType: 'team', score: 72 },
      { scoreType: 'funding', score: 62 },
      { scoreType: 'market_position', score: 50 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 70 },
      { scoreType: 'overall', score: 65 },
    ],
  },

  // ── Vast ──
  {
    slug: 'vast',
    fundingRounds: [
      { date: '2023-10-01', amount: 150000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Jed McCaleb (founder)' },
      { date: '2024-08-01', amount: 100000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Jed McCaleb' },
    ],
    keyPersonnel: [
      { name: 'Max Haot', title: 'CEO', role: 'executive', previousCompanies: ['Launcher (acquired)', 'Livestream'] },
    ],
    events: [
      { date: '2024-03-01', type: 'milestone', title: 'Vast Haven-1 commercial space station awarded SpaceX Falcon 9 launch for 2025', importance: 8 },
      { date: '2023-05-01', type: 'acquisition', title: 'Vast acquires Launcher, gaining rocket engine and satellite bus technology', importance: 7 },
    ],
    facilities: [
      { name: 'Vast HQ', type: 'headquarters', city: 'Long Beach', state: 'CA', country: 'US' },
      { name: 'Vast Manufacturing', type: 'manufacturing', city: 'Long Beach', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 65 },
      { scoreType: 'team', score: 68 },
      { scoreType: 'funding', score: 72 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 70 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 67 },
    ],
  },

  // ── Voyager Space ──
  {
    slug: 'voyager-space',
    fundingRounds: [
      { date: '2023-06-01', amount: 80000000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Koch Strategic Platforms' },
      { date: '2022-01-01', amount: 60000000, seriesLabel: 'Series C', roundType: 'equity' },
    ],
    keyPersonnel: [
      { name: 'Dylan Taylor', title: 'Chairman & CEO', role: 'founder', previousCompanies: ['Colliers International'] },
      { name: 'Matthew Kuta', title: 'President', role: 'executive', previousCompanies: ['Lockheed Martin'] },
    ],
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'Starlab commercial space station selected by NASA for development', importance: 9 },
      { date: '2022-08-01', type: 'acquisition', title: 'Acquires Nanoracks, the leading commercial space station access provider', importance: 8 },
    ],
    facilities: [
      { name: 'Voyager Space HQ', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'NASA', title: 'Commercial LEO Destination (CLD) — Starlab', value: 160000000, awardDate: '2021-12-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 60 },
      { scoreType: 'team', score: 72 },
      { scoreType: 'funding', score: 70 },
      { scoreType: 'market_position', score: 65 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 68 },
    ],
  },

  // ── True Anomaly ──
  {
    slug: 'true-anomaly',
    fundingRounds: [
      { date: '2024-04-01', amount: 100000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Riot Ventures' },
      { date: '2023-01-01', amount: 30000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Eclipse Ventures' },
    ],
    keyPersonnel: [
      { name: 'Even Rogers', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['US Air Force'] },
    ],
    events: [
      { date: '2024-03-04', type: 'milestone', title: 'Jackal spacecraft launched on SpaceX Transporter-10 for proximity ops demo', importance: 8 },
      { date: '2024-04-01', type: 'funding', title: 'Raises $100M Series B for space domain awareness and defense', importance: 7 },
    ],
    facilities: [
      { name: 'True Anomaly HQ', type: 'headquarters', city: 'Colorado Springs', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Orbital Prime / Tactically Responsive Space', value: 30000000, awardDate: '2023-06-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 68 },
      { scoreType: 'team', score: 65 },
      { scoreType: 'funding', score: 72 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 80 },
      { scoreType: 'momentum', score: 78 },
      { scoreType: 'overall', score: 69 },
    ],
  },

  // ── Apex ──
  {
    slug: 'apex',
    fundingRounds: [
      { date: '2024-06-01', amount: 95000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'XYZ Venture Capital' },
      { date: '2023-03-01', amount: 16000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Shield Capital' },
    ],
    keyPersonnel: [
      { name: 'Ian Cinnamon', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2024-09-01', type: 'milestone', title: 'Apex Aries satellite bus selected for first customer missions', importance: 7 },
      { date: '2024-06-01', type: 'funding', title: 'Raises $95M Series B to scale satellite bus production', importance: 8 },
    ],
    facilities: [
      { name: 'Apex HQ & Factory', type: 'headquarters', city: 'Los Angeles', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 70 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 68 },
      { scoreType: 'market_position', score: 52 },
      { scoreType: 'growth', score: 78 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 67 },
    ],
  },

  // ── Umbra ──
  {
    slug: 'umbra',
    fundingRounds: [
      { date: '2023-09-01', amount: 60000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Spark Capital' },
      { date: '2022-01-01', amount: 32000000, seriesLabel: 'Series B', roundType: 'equity' },
    ],
    events: [
      { date: '2023-05-01', type: 'milestone', title: 'Umbra deploys 6th SAR satellite, achieving sub-25cm resolution', importance: 8 },
      { date: '2022-06-01', type: 'milestone', title: 'First commercial SAR satellite launched on SpaceX Transporter-5', importance: 7 },
    ],
    facilities: [
      { name: 'Umbra HQ', type: 'headquarters', city: 'Santa Barbara', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 78 },
      { scoreType: 'team', score: 65 },
      { scoreType: 'funding', score: 65 },
      { scoreType: 'market_position', score: 60 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 70 },
      { scoreType: 'overall', score: 68 },
    ],
  },

  // ── HawkEye 360 ──
  {
    slug: 'hawkeye-360',
    fundingRounds: [
      { date: '2023-09-01', amount: 58000000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'Sumitomo Corporation' },
      { date: '2022-03-01', amount: 145000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Insight Partners' },
      { date: '2020-04-01', amount: 70000000, seriesLabel: 'Series B', roundType: 'equity' },
    ],
    events: [
      { date: '2023-01-01', type: 'milestone', title: 'HawkEye 360 deploys Cluster 6 & 7, expanding RF constellation to 21 satellites', importance: 8 },
      { date: '2022-04-01', type: 'milestone', title: 'Awarded NGA GEOINT contract for RF analytics', importance: 8 },
    ],
    facilities: [
      { name: 'HawkEye 360 HQ', type: 'headquarters', city: 'Herndon', state: 'VA', country: 'US' },
    ],
    contracts: [
      { agency: 'NGA', title: 'RF Geospatial Analytics Services', value: 25000000, awardDate: '2022-04-01' },
      { agency: 'Space Force', title: 'Electro-Optical/RF Characterization', value: 10000000, awardDate: '2023-01-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 82 },
      { scoreType: 'team', score: 72 },
      { scoreType: 'funding', score: 82 },
      { scoreType: 'market_position', score: 72 },
      { scoreType: 'growth', score: 78 },
      { scoreType: 'momentum', score: 80 },
      { scoreType: 'overall', score: 78 },
    ],
  },

  // ── BlackSky ──
  {
    slug: 'blacksky',
    fundingRounds: [
      { date: '2021-09-09', amount: 450000000, seriesLabel: 'SPAC', roundType: 'spac', leadInvestor: 'Osprey Technology Acquisition' },
    ],
    events: [
      { date: '2023-08-01', type: 'milestone', title: 'Gen-3 satellites achieve 35cm resolution with higher revisit rates', importance: 8 },
      { date: '2021-09-09', type: 'ipo', title: 'BlackSky goes public via SPAC merger at $1.5B valuation', importance: 8 },
    ],
    facilities: [
      { name: 'BlackSky HQ', type: 'headquarters', city: 'Herndon', state: 'VA', country: 'US' },
      { name: 'BlackSky Seattle Operations', type: 'office', city: 'Seattle', state: 'WA', country: 'US' },
    ],
    contracts: [
      { agency: 'NGA', title: 'Electro-Optical Commercial Layer (EOCL)', value: 86000000, awardDate: '2022-08-01' },
      { agency: 'NRO', title: 'Study Contract for Commercial Imagery', value: 15000000, awardDate: '2023-01-01' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 110000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 97000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 62000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 78 },
      { scoreType: 'team', score: 68 },
      { scoreType: 'funding', score: 70 },
      { scoreType: 'market_position', score: 72 },
      { scoreType: 'growth', score: 70 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 72 },
    ],
  },

  // ── AST SpaceMobile ──
  {
    slug: 'ast-spacemobile',
    fundingRounds: [
      { date: '2024-01-01', amount: 155000000, seriesLabel: 'Follow-on Offering', roundType: 'equity' },
      { date: '2021-04-06', amount: 462000000, seriesLabel: 'SPAC', roundType: 'spac' },
    ],
    events: [
      { date: '2024-09-12', type: 'milestone', title: 'First 5 BlueBird commercial satellites launched on SpaceX Falcon 9', importance: 9 },
      { date: '2023-09-12', type: 'milestone', title: 'BlueWalker 3 test satellite makes first direct-to-cell broadband call', importance: 9 },
      { date: '2024-01-01', type: 'milestone', title: 'Partnerships with AT&T, Vodafone, Rakuten for direct-to-device service', importance: 8 },
    ],
    facilities: [
      { name: 'AST SpaceMobile HQ', type: 'headquarters', city: 'Midland', state: 'TX', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 2000000, source: 'SEC filing (pre-revenue)', confidenceLevel: 'reported' },
      { year: 2023, revenue: 500000, source: 'SEC filing (pre-revenue)', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 85 },
      { scoreType: 'team', score: 68 },
      { scoreType: 'funding', score: 75 },
      { scoreType: 'market_position', score: 60 },
      { scoreType: 'growth', score: 82 },
      { scoreType: 'momentum', score: 88 },
      { scoreType: 'overall', score: 76 },
    ],
  },

  // ── Lynk Global ──
  {
    slug: 'lynk-global',
    fundingRounds: [
      { date: '2023-06-01', amount: 60000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Cobalt Ventures' },
      { date: '2021-03-01', amount: 12000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    events: [
      { date: '2022-04-01', type: 'milestone', title: 'Lynk receives first-ever commercial license for satellite-to-phone service', importance: 9 },
      { date: '2023-10-01', type: 'milestone', title: 'Commercial service launches in Palau — first satellite-direct-to-phone', importance: 8 },
    ],
    facilities: [
      { name: 'Lynk Global HQ', type: 'headquarters', city: 'Falls Church', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 78 },
      { scoreType: 'team', score: 60 },
      { scoreType: 'funding', score: 58 },
      { scoreType: 'market_position', score: 52 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 64 },
    ],
  },

  // ── Momentus ──
  {
    slug: 'momentus',
    fundingRounds: [
      { date: '2021-08-12', amount: 258000000, seriesLabel: 'SPAC', roundType: 'spac' },
    ],
    events: [
      { date: '2023-01-03', type: 'milestone', title: 'Vigoride OTV completes first mission on SpaceX Transporter-6', importance: 7 },
      { date: '2021-08-12', type: 'ipo', title: 'Momentus goes public via SPAC merger', importance: 7 },
    ],
    facilities: [
      { name: 'Momentus HQ', type: 'headquarters', city: 'San Jose', state: 'CA', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 8000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 3000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 55 },
      { scoreType: 'team', score: 48 },
      { scoreType: 'funding', score: 45 },
      { scoreType: 'market_position', score: 42 },
      { scoreType: 'growth', score: 40 },
      { scoreType: 'momentum', score: 45 },
      { scoreType: 'overall', score: 46 },
    ],
  },

  // ── Sidus Space ──
  {
    slug: 'sidus-space',
    fundingRounds: [
      { date: '2022-12-01', amount: 12000000, seriesLabel: 'IPO', roundType: 'ipo' },
    ],
    events: [
      { date: '2023-06-12', type: 'milestone', title: 'LizzieSat-1 satellite launched on SpaceX Transporter-8', importance: 7 },
      { date: '2022-12-01', type: 'ipo', title: 'Sidus Space lists on NYSE American', importance: 7 },
    ],
    facilities: [
      { name: 'Sidus Space HQ & Manufacturing', type: 'headquarters', city: 'Cape Canaveral', state: 'FL', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 7000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 4000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 50 },
      { scoreType: 'team', score: 42 },
      { scoreType: 'funding', score: 35 },
      { scoreType: 'market_position', score: 35 },
      { scoreType: 'growth', score: 45 },
      { scoreType: 'momentum', score: 48 },
      { scoreType: 'overall', score: 42 },
    ],
  },

  // ── York Space Systems ──
  {
    slug: 'york-space-systems',
    fundingRounds: [
      { date: '2022-06-01', amount: 100000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'AE Industrial Partners' },
      { date: '2020-04-01', amount: 30000000, seriesLabel: 'Series B', roundType: 'equity' },
    ],
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'SDA Tranche 0 Transport Layer satellites delivered and launched', importance: 8 },
      { date: '2022-06-01', type: 'funding', title: 'Raises $100M Series C from AE Industrial', importance: 7 },
    ],
    facilities: [
      { name: 'York Space HQ & Factory', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Development Agency', title: 'Tranche 0 Transport Layer Satellites', value: 94000000, awardDate: '2020-08-01' },
      { agency: 'Space Development Agency', title: 'Tranche 1 Transport Layer', value: 200000000, awardDate: '2022-09-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 70 },
      { scoreType: 'market_position', score: 65 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 69 },
    ],
  },

  // ── Rocket Factory Augsburg ──
  {
    slug: 'rocket-factory-augsburg',
    fundingRounds: [
      { date: '2023-06-01', amount: 40000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'APEX Ventures' },
      { date: '2021-09-01', amount: 30000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'RFA ONE rocket hot-fire test at Esrange Space Center, Sweden', importance: 7 },
      { date: '2023-06-01', type: 'funding', title: 'Raises €40M Series B for launch development', importance: 6 },
    ],
    facilities: [
      { name: 'RFA HQ', type: 'headquarters', city: 'Augsburg', country: 'DE' },
      { name: 'Esrange Launch Site', type: 'launch_site', city: 'Kiruna', country: 'SE' },
    ],
    scores: [
      { scoreType: 'technology', score: 58 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 55 },
      { scoreType: 'market_position', score: 45 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 58 },
      { scoreType: 'overall', score: 55 },
    ],
  },

  // ── D-Orbit ──
  {
    slug: 'd-orbit',
    fundingRounds: [
      { date: '2023-07-01', amount: 110000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'European Investment Bank' },
      { date: '2021-06-01', amount: 100000000, seriesLabel: 'Series B', roundType: 'debt+equity' },
    ],
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'ION Satellite Carrier completes 10th successful mission', importance: 8 },
      { date: '2023-07-01', type: 'funding', title: 'Raises $110M from EIB and other investors for fleet expansion', importance: 7 },
    ],
    facilities: [
      { name: 'D-Orbit HQ', type: 'headquarters', city: 'Como', country: 'IT' },
      { name: 'D-Orbit UK', type: 'office', city: 'Harwell', country: 'GB' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 65 },
      { scoreType: 'funding', score: 70 },
      { scoreType: 'market_position', score: 62 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 69 },
    ],
  },

  // ── Kayhan Space ──
  {
    slug: 'kayhan-space',
    fundingRounds: [
      { date: '2023-01-01', amount: 10000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'Kayhan Pathfinder STM software adopted by multiple satellite operators', importance: 6 },
    ],
    facilities: [
      { name: 'Kayhan Space HQ', type: 'headquarters', city: 'Boulder', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'SBIR Phase II — Space Traffic Management', value: 2000000, awardDate: '2022-06-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 62 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 42 },
      { scoreType: 'market_position', score: 45 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 51 },
    ],
  },

  // ── Privateer ──
  {
    slug: 'privateer',
    fundingRounds: [
      { date: '2022-03-01', amount: 56600000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Type One Ventures' },
    ],
    keyPersonnel: [
      { name: 'Alex Fielding', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Apple'] },
    ],
    events: [
      { date: '2023-01-01', type: 'milestone', title: 'Wayfinder space sustainability map reaches 35,000+ tracked objects', importance: 7 },
      { date: '2022-03-01', type: 'funding', title: 'Raises $56.6M Series A from Type One Ventures', importance: 7 },
    ],
    facilities: [
      { name: 'Privateer HQ', type: 'headquarters', city: 'Maui', state: 'HI', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 65 },
      { scoreType: 'team', score: 68 },
      { scoreType: 'funding', score: 55 },
      { scoreType: 'market_position', score: 50 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 58 },
      { scoreType: 'overall', score: 58 },
    ],
  },

  // ── Albedo ──
  {
    slug: 'albedo',
    fundingRounds: [
      { date: '2024-03-01', amount: 97000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Breakthrough Energy Ventures' },
      { date: '2022-09-01', amount: 48000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Shield Capital' },
    ],
    events: [
      { date: '2024-03-01', type: 'funding', title: 'Raises $97M Series C for VLEO satellite constellation', importance: 8 },
      { date: '2023-12-01', type: 'milestone', title: 'Signs first $100M+ commercial customer contract for 10cm imagery', importance: 8 },
    ],
    facilities: [
      { name: 'Albedo HQ', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'NRO', title: 'Study Contract — VLEO Imagery', value: 10000000, awardDate: '2023-06-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 75 },
      { scoreType: 'team', score: 65 },
      { scoreType: 'funding', score: 72 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 80 },
      { scoreType: 'momentum', score: 78 },
      { scoreType: 'overall', score: 71 },
    ],
  },

  // ── Orbit Fab ──
  {
    slug: 'orbit-fab',
    fundingRounds: [
      { date: '2022-10-01', amount: 28500000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'U.S. Innovative Technology Fund' },
    ],
    events: [
      { date: '2022-06-01', type: 'milestone', title: 'Tanker-001 Tenzing deployed — first commercial fuel depot in orbit', importance: 9 },
      { date: '2023-01-01', type: 'milestone', title: 'RAFTI refueling port adopted as industry standard by multiple programs', importance: 7 },
    ],
    facilities: [
      { name: 'Orbit Fab HQ', type: 'headquarters', city: 'San Francisco', state: 'CA', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Orbital Prime — In-Space Refueling Demo', value: 12000000, awardDate: '2022-09-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 80 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 52 },
      { scoreType: 'market_position', score: 60 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 65 },
    ],
  },

  // ── CesiumAstro ──
  {
    slug: 'cesiumastro',
    fundingRounds: [
      { date: '2023-07-01', amount: 60000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'RTX Ventures' },
      { date: '2021-12-01', amount: 16000000, seriesLabel: 'Series B', roundType: 'equity' },
    ],
    events: [
      { date: '2023-07-01', type: 'funding', title: 'Raises $60M Series C from RTX Ventures', importance: 7 },
      { date: '2023-01-01', type: 'milestone', title: 'Nightingale software-defined radio payloads selected for DoD missions', importance: 7 },
    ],
    facilities: [
      { name: 'CesiumAstro HQ', type: 'headquarters', city: 'Austin', state: 'TX', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Development Agency', title: 'Tranche 2 Communication Payloads', value: 20000000, awardDate: '2023-03-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 75 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 62 },
      { scoreType: 'market_position', score: 58 },
      { scoreType: 'growth', score: 70 },
      { scoreType: 'momentum', score: 68 },
      { scoreType: 'overall', score: 66 },
    ],
  },

  // ── Phase Four ──
  {
    slug: 'phase-four',
    fundingRounds: [
      { date: '2022-09-01', amount: 26000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'New Science Ventures' },
      { date: '2020-08-01', amount: 11000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'Maxwell plasma thruster enters series production for satellite constellations', importance: 7 },
    ],
    facilities: [
      { name: 'Phase Four HQ', type: 'headquarters', city: 'El Segundo', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 58 },
      { scoreType: 'funding', score: 50 },
      { scoreType: 'market_position', score: 48 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 55 },
      { scoreType: 'overall', score: 57 },
    ],
  },

  // ── Atomos Space ──
  {
    slug: 'atomos-space',
    fundingRounds: [
      { date: '2023-04-01', amount: 12000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Piva Capital' },
    ],
    events: [
      { date: '2024-03-01', type: 'milestone', title: 'Quark electric OTV selected for first commercial tug mission', importance: 7 },
    ],
    facilities: [
      { name: 'Atomos Space HQ', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 55 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 40 },
      { scoreType: 'market_position', score: 38 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 48 },
    ],
  },

  // ── SpiderOak ──
  {
    slug: 'spideroak',
    fundingRounds: [
      { date: '2023-06-01', amount: 16400000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Empyrean Technology Solutions' },
    ],
    events: [
      { date: '2023-09-01', type: 'milestone', title: 'OrbitSecure zero-trust space comms platform adopted by DoD customers', importance: 7 },
    ],
    facilities: [
      { name: 'SpiderOak HQ', type: 'headquarters', city: 'San Antonio', state: 'TX', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Zero-Trust Space Communication Prototype', value: 5000000, awardDate: '2023-01-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 70 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 42 },
      { scoreType: 'market_position', score: 45 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 52 },
      { scoreType: 'overall', score: 53 },
    ],
  },

  // ── Parsons ──
  {
    slug: 'parsons',
    events: [
      { date: '2019-05-08', type: 'ipo', title: 'Parsons Corporation goes public on NYSE', importance: 8 },
      { date: '2023-10-01', type: 'acquisition', title: 'Acquires BlackSignal Technologies for space cybersecurity capabilities', importance: 7 },
    ],
    facilities: [
      { name: 'Parsons HQ', type: 'headquarters', city: 'Centreville', state: 'VA', country: 'US' },
      { name: 'Huntsville Space Operations', type: 'office', city: 'Huntsville', state: 'AL', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Ground-Based Strategic Deterrent IT Support', value: 500000000, awardDate: '2020-09-01' },
      { agency: 'NASA', title: 'Marshall Space Flight Center Engineering Support', value: 150000000, awardDate: '2021-06-01' },
      { agency: 'Missile Defense Agency', title: 'C2BMC System Integration', value: 950000000, awardDate: '2022-01-01' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 6400000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 5400000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 4200000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 68 },
      { scoreType: 'team', score: 78 },
      { scoreType: 'funding', score: 85 },
      { scoreType: 'market_position', score: 80 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 70 },
      { scoreType: 'overall', score: 76 },
    ],
  },

  // ── General Atomics ──
  {
    slug: 'general-atomics',
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'Orbital Test Bed-2 satellite launched for DoD with on-board nuclear reactor demo', importance: 8 },
      { date: '2024-01-01', type: 'contract', title: 'Selected for Gambit satellite constellation EO/IR payloads', importance: 8 },
    ],
    facilities: [
      { name: 'General Atomics HQ', type: 'headquarters', city: 'San Diego', state: 'CA', country: 'US' },
      { name: 'Electromagnetic Systems', type: 'manufacturing', city: 'San Diego', state: 'CA', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Development Agency', title: 'Gambit Satellite Constellation', value: 700000000, awardDate: '2024-01-01' },
      { agency: 'DOE/DARPA', title: 'DRACO Nuclear Thermal Propulsion', value: 80000000, awardDate: '2023-07-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 82 },
      { scoreType: 'team', score: 80 },
      { scoreType: 'funding', score: 75 },
      { scoreType: 'market_position', score: 82 },
      { scoreType: 'growth', score: 65 },
      { scoreType: 'momentum', score: 78 },
      { scoreType: 'overall', score: 77 },
    ],
  },

  // ── Ball Aerospace ──
  {
    slug: 'ball-aerospace',
    events: [
      { date: '2024-02-16', type: 'acquisition', title: 'Ball Aerospace acquired by BAE Systems for $5.6B', importance: 9 },
      { date: '2021-12-25', type: 'milestone', title: 'Ball-built JWST mirror and sunshield launch successfully on Ariane 5', importance: 10 },
    ],
    facilities: [
      { name: 'Ball Aerospace HQ', type: 'headquarters', city: 'Broomfield', state: 'CO', country: 'US' },
      { name: 'Ball Aerospace Spacecraft Facility', type: 'manufacturing', city: 'Boulder', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'NASA', title: 'James Webb Space Telescope — Optics and Sunshield', value: 800000000, awardDate: '2002-01-01' },
      { agency: 'NASA', title: 'Green Propellant Infusion Mission', value: 65000000, awardDate: '2018-01-01' },
      { agency: 'NOAA', title: 'JPSS Instrument Suite', value: 500000000, awardDate: '2020-01-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 92 },
      { scoreType: 'team', score: 85 },
      { scoreType: 'funding', score: 80 },
      { scoreType: 'market_position', score: 85 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 80 },
    ],
  },

  // ── Aerojet Rocketdyne ──
  {
    slug: 'aerojet-rocketdyne',
    events: [
      { date: '2023-07-28', type: 'acquisition', title: 'L3Harris completes $4.7B acquisition of Aerojet Rocketdyne', importance: 9 },
      { date: '2022-11-16', type: 'milestone', title: 'RS-25 engines power SLS Artemis I launch to the Moon', importance: 10 },
    ],
    facilities: [
      { name: 'Aerojet Rocketdyne HQ', type: 'headquarters', city: 'El Segundo', state: 'CA', country: 'US' },
      { name: 'Stennis Engine Test Facility', type: 'manufacturing', city: 'Stennis', state: 'MS', country: 'US' },
      { name: 'West Palm Beach Solid Rocket', type: 'manufacturing', city: 'West Palm Beach', state: 'FL', country: 'US' },
    ],
    contracts: [
      { agency: 'NASA', title: 'RS-25 Engine Production — SLS', value: 1800000000, awardDate: '2020-01-01' },
      { agency: 'NASA', title: 'RL10 Engines — Upper Stage Propulsion', value: 300000000, awardDate: '2019-01-01' },
      { agency: 'Missile Defense Agency', title: 'Divert & Attitude Control Systems', value: 500000000, awardDate: '2021-01-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 90 },
      { scoreType: 'team', score: 82 },
      { scoreType: 'funding', score: 85 },
      { scoreType: 'market_position', score: 88 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 65 },
      { scoreType: 'overall', score: 79 },
    ],
  },

  // ── Peraton ──
  {
    slug: 'peraton',
    events: [
      { date: '2021-02-01', type: 'acquisition', title: 'Peraton acquires Northrop Grumman IT and Mission Support for $3.4B', importance: 9 },
      { date: '2023-08-01', type: 'contract', title: 'Awarded NASA Goddard AEGIS IT services contract', importance: 7 },
    ],
    facilities: [
      { name: 'Peraton HQ', type: 'headquarters', city: 'Herndon', state: 'VA', country: 'US' },
      { name: 'Colorado Springs Operations', type: 'office', city: 'Colorado Springs', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'NRO', title: 'Ground Enterprise Directorate Support', value: 2000000000, awardDate: '2022-01-01' },
      { agency: 'NASA', title: 'Goddard AEGIS IT Services', value: 730000000, awardDate: '2023-08-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 65 },
      { scoreType: 'team', score: 75 },
      { scoreType: 'funding', score: 70 },
      { scoreType: 'market_position', score: 72 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 65 },
      { scoreType: 'overall', score: 69 },
    ],
  },

  // ── Leidos ──
  {
    slug: 'leidos',
    events: [
      { date: '2023-10-01', type: 'contract', title: 'Awarded $4.4B NASA AEGIS contract', importance: 8 },
      { date: '2024-01-01', type: 'milestone', title: 'Leidos selected for Next Generation OPIR ground system', importance: 8 },
    ],
    facilities: [
      { name: 'Leidos HQ', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
      { name: 'Huntsville Space Operations', type: 'office', city: 'Huntsville', state: 'AL', country: 'US' },
    ],
    contracts: [
      { agency: 'NASA', title: 'NEST III IT Services', value: 2800000000, awardDate: '2022-06-01' },
      { agency: 'Space Force', title: 'Next Generation OPIR Ground System', value: 1500000000, awardDate: '2024-01-01' },
      { agency: 'Missile Defense Agency', title: 'Command and Control BMC3 Support', value: 600000000, awardDate: '2021-12-01' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 16100000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 15400000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 14400000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 82 },
      { scoreType: 'funding', score: 90 },
      { scoreType: 'market_position', score: 85 },
      { scoreType: 'growth', score: 65 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 78 },
    ],
  },

  // ── CACI International ──
  {
    slug: 'caci-international',
    events: [
      { date: '2023-12-01', type: 'contract', title: 'Awarded Space Force Enterprise Ground Services contract', importance: 8 },
      { date: '2024-02-01', type: 'acquisition', title: 'Acquires Azure Summit Technology for EW capabilities', importance: 7 },
    ],
    facilities: [
      { name: 'CACI HQ', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
      { name: 'Colorado Springs Space Center', type: 'office', city: 'Colorado Springs', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Enterprise Ground Services (EGS)', value: 1200000000, awardDate: '2023-12-01' },
      { agency: 'NGA', title: 'GEOINT Analytics and IT Support', value: 400000000, awardDate: '2022-06-01' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 7700000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 7100000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 6200000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 70 },
      { scoreType: 'team', score: 78 },
      { scoreType: 'funding', score: 88 },
      { scoreType: 'market_position', score: 80 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 76 },
    ],
  },

  // ── SAIC ──
  {
    slug: 'saic',
    events: [
      { date: '2023-08-01', type: 'contract', title: 'Awarded NASA Langley TEAMS IV engineering contract', importance: 7 },
      { date: '2024-01-01', type: 'milestone', title: 'SAIC supports JADC2 space integration for NORAD/USNORTHCOM', importance: 7 },
    ],
    facilities: [
      { name: 'SAIC HQ', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
      { name: 'Huntsville Operations', type: 'office', city: 'Huntsville', state: 'AL', country: 'US' },
    ],
    contracts: [
      { agency: 'NASA', title: 'Langley TEAMS IV Engineering', value: 860000000, awardDate: '2023-08-01' },
      { agency: 'Space Force', title: 'Space C2 Systems Engineering', value: 450000000, awardDate: '2022-03-01' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 7400000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 7400000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 7100000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 68 },
      { scoreType: 'team', score: 78 },
      { scoreType: 'funding', score: 88 },
      { scoreType: 'market_position', score: 78 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 65 },
      { scoreType: 'overall', score: 74 },
    ],
  },

  // ── Booz Allen Hamilton ──
  {
    slug: 'booz-allen-hamilton',
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'Launches dedicated Space Group to consolidate defense space capabilities', importance: 7 },
      { date: '2024-03-01', type: 'contract', title: 'Awarded multi-billion PRISM IDIQ for intelligence community space work', importance: 8 },
    ],
    facilities: [
      { name: 'Booz Allen HQ', type: 'headquarters', city: 'McLean', state: 'VA', country: 'US' },
      { name: 'Colorado Springs Space Operations', type: 'office', city: 'Colorado Springs', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Space Cyber & Mission Defense', value: 300000000, awardDate: '2023-01-01' },
      { agency: 'NRO', title: 'PRISM IDIQ — Intelligence Space Programs', value: 1000000000, awardDate: '2024-03-01' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 11200000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 9400000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 8400000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 65 },
      { scoreType: 'team', score: 82 },
      { scoreType: 'funding', score: 90 },
      { scoreType: 'market_position', score: 82 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 77 },
    ],
  },

  // ── Airbus Defence & Space ──
  {
    slug: 'airbus-defence-space',
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'Airbus delivers OneWeb satellites — 630+ constellation complete', importance: 9 },
      { date: '2023-09-01', type: 'contract', title: 'Selected for ESA Copernicus expansion satellite ROSE-L SAR mission', importance: 8 },
    ],
    facilities: [
      { name: 'Airbus D&S HQ', type: 'headquarters', city: 'Toulouse', country: 'FR' },
      { name: 'Airbus Satellites UK', type: 'manufacturing', city: 'Stevenage', country: 'GB' },
      { name: 'Airbus Friedrichshafen', type: 'manufacturing', city: 'Friedrichshafen', country: 'DE' },
    ],
    contracts: [
      { agency: 'ESA', title: 'Copernicus ROSE-L SAR Satellite', value: 430000000, awardDate: '2023-09-01' },
      { agency: 'ESA', title: 'Galileo Second Generation Satellites', value: 1470000000, awardDate: '2021-01-01' },
      { agency: 'UK Ministry of Defence', title: 'Skynet 6A Satellite Communications', value: 600000000, awardDate: '2020-07-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 92 },
      { scoreType: 'team', score: 90 },
      { scoreType: 'funding', score: 95 },
      { scoreType: 'market_position', score: 92 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 78 },
      { scoreType: 'overall', score: 85 },
    ],
  },

  // ── Thales Alenia Space ──
  {
    slug: 'thales-alenia-space',
    events: [
      { date: '2024-02-01', type: 'contract', title: 'Awarded contract for Axiom Station habitation module', importance: 8 },
      { date: '2023-06-01', type: 'milestone', title: 'Completes COSMO-SkyMed Second Generation constellation', importance: 8 },
    ],
    facilities: [
      { name: 'Thales Alenia Space HQ', type: 'headquarters', city: 'Cannes', country: 'FR' },
      { name: 'Turin Spacecraft Center', type: 'manufacturing', city: 'Turin', country: 'IT' },
    ],
    contracts: [
      { agency: 'ESA', title: 'HERA Asteroid Mission Spacecraft', value: 129000000, awardDate: '2019-11-01' },
      { agency: 'Italian Space Agency', title: 'COSMO-SkyMed Second Gen SAR Satellites', value: 400000000, awardDate: '2015-01-01' },
      { agency: 'Axiom Space', title: 'Habitation Module for Axiom Station', value: 350000000, awardDate: '2024-02-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 90 },
      { scoreType: 'team', score: 88 },
      { scoreType: 'funding', score: 92 },
      { scoreType: 'market_position', score: 90 },
      { scoreType: 'growth', score: 58 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 83 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// TIER 3 ENRICHMENTS
// ────────────────────────────────────────────────────────────────

const TIER_3_ENRICHMENTS: EnrichmentData[] = [
  // ── Stoke Space ──
  {
    slug: 'stoke-space',
    fundingRounds: [
      { date: '2024-03-01', amount: 100000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'DCVC' },
      { date: '2022-10-01', amount: 65000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Breakthrough Energy Ventures' },
    ],
    keyPersonnel: [
      { name: 'Tom Feldman', title: 'Co-Founder & CTO', role: 'founder', previousCompanies: ['Blue Origin'] },
    ],
    events: [
      { date: '2023-09-01', type: 'milestone', title: 'Successful full-scale second stage hop test — world-first for reusable upper stage', importance: 9 },
      { date: '2024-03-01', type: 'funding', title: 'Raises $100M Series B for Nova rocket development', importance: 7 },
    ],
    facilities: [
      { name: 'Stoke Space HQ & Factory', type: 'headquarters', city: 'Kent', state: 'WA', country: 'US' },
      { name: 'Moses Lake Test Site', type: 'test_facility', city: 'Moses Lake', state: 'WA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 68 },
      { scoreType: 'funding', score: 68 },
      { scoreType: 'market_position', score: 48 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 78 },
      { scoreType: 'overall', score: 67 },
    ],
  },

  // ── Phantom Space ──
  {
    slug: 'phantom-space',
    fundingRounds: [
      { date: '2022-06-01', amount: 16000000, seriesLabel: 'Series A', roundType: 'equity' },
      { date: '2021-03-01', amount: 5000000, seriesLabel: 'Seed', roundType: 'seed' },
    ],
    events: [
      { date: '2022-06-01', type: 'funding', title: 'Raises $16M Series A for Daytona rocket development', importance: 6 },
    ],
    facilities: [
      { name: 'Phantom Space HQ', type: 'headquarters', city: 'Tucson', state: 'AZ', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 38 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 30 },
      { scoreType: 'market_position', score: 28 },
      { scoreType: 'growth', score: 42 },
      { scoreType: 'momentum', score: 35 },
      { scoreType: 'overall', score: 37 },
    ],
  },

  // ── Varda Space Industries ──
  {
    slug: 'varda-space-industries',
    fundingRounds: [
      { date: '2024-04-01', amount: 90000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Khosla Ventures' },
      { date: '2022-12-01', amount: 42000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Khosla Ventures' },
    ],
    keyPersonnel: [
      { name: 'Delian Asparouhov', title: 'Co-Founder & President', role: 'founder', previousCompanies: ['Founders Fund'] },
    ],
    events: [
      { date: '2024-02-21', type: 'milestone', title: 'W-Series 1 capsule successfully lands in Utah — first commercial in-space pharma return', importance: 10 },
      { date: '2023-06-12', type: 'milestone', title: 'First Varda spacecraft launched on SpaceX Transporter-8', importance: 8 },
    ],
    facilities: [
      { name: 'Varda HQ & Clean Room', type: 'headquarters', city: 'El Segundo', state: 'CA', country: 'US' },
    ],
    contracts: [
      { agency: 'Air Force Research Lab', title: 'Microgravity Manufacturing Study', value: 2000000, awardDate: '2023-01-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 82 },
      { scoreType: 'team', score: 72 },
      { scoreType: 'funding', score: 68 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 80 },
      { scoreType: 'momentum', score: 85 },
      { scoreType: 'overall', score: 73 },
    ],
  },

  // ── Outpost Technologies ──
  {
    slug: 'outpost-technologies',
    fundingRounds: [
      { date: '2023-01-01', amount: 7500000, seriesLabel: 'Seed', roundType: 'seed' },
    ],
    events: [
      { date: '2023-12-01', type: 'milestone', title: 'Completes parachute recovery test for cargo return capsule', importance: 6 },
    ],
    facilities: [
      { name: 'Outpost HQ', type: 'headquarters', city: 'Chandler', state: 'AZ', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 45 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 28 },
      { scoreType: 'market_position', score: 30 },
      { scoreType: 'growth', score: 45 },
      { scoreType: 'momentum', score: 40 },
      { scoreType: 'overall', score: 40 },
    ],
  },

  // ── SpinLaunch ──
  {
    slug: 'spinlaunch',
    fundingRounds: [
      { date: '2022-09-01', amount: 71000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'ATW Partners' },
      { date: '2018-01-01', amount: 40000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Kleiner Perkins' },
    ],
    events: [
      { date: '2022-04-01', type: 'milestone', title: 'Completes 10th successful suborbital accelerator launch test', importance: 7 },
      { date: '2021-10-22', type: 'milestone', title: 'First successful test launch from suborbital accelerator at Spaceport America', importance: 8 },
    ],
    facilities: [
      { name: 'SpinLaunch HQ', type: 'headquarters', city: 'Long Beach', state: 'CA', country: 'US' },
      { name: 'Spaceport America Test Site', type: 'test_facility', city: 'Truth or Consequences', state: 'NM', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 55 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 62 },
      { scoreType: 'market_position', score: 35 },
      { scoreType: 'growth', score: 48 },
      { scoreType: 'momentum', score: 52 },
      { scoreType: 'overall', score: 50 },
    ],
  },

  // ── Exolaunch ──
  {
    slug: 'exolaunch',
    fundingRounds: [
      { date: '2023-06-01', amount: 20000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Alpine Space Ventures' },
      { date: '2021-09-01', amount: 15000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    products: [
      { name: 'Reliant OTV', category: 'orbital_transfer_vehicle', description: 'In-space tug for precise satellite deployment from rideshare missions.', status: 'active' },
    ],
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'Exolaunch deploys 300th satellite via rideshare missions', importance: 7 },
    ],
    facilities: [
      { name: 'Exolaunch HQ', type: 'headquarters', city: 'Berlin', country: 'DE' },
    ],
    scores: [
      { scoreType: 'technology', score: 62 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 48 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 62 },
      { scoreType: 'momentum', score: 60 },
      { scoreType: 'overall', score: 57 },
    ],
  },

  // ── Epsilon3 ──
  {
    slug: 'epsilon3',
    fundingRounds: [
      { date: '2023-10-01', amount: 24000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Lux Capital' },
      { date: '2021-09-01', amount: 15000000, seriesLabel: 'Seed', roundType: 'seed', leadInvestor: 'Y Combinator' },
    ],
    keyPersonnel: [
      { name: 'Aaron Sullivan', title: 'Co-Founder & CTO', role: 'founder', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2023-10-01', type: 'funding', title: 'Raises $24M Series A from Lux Capital', importance: 7 },
      { date: '2023-01-01', type: 'milestone', title: 'Platform adopted by 20+ space companies including Intuitive Machines', importance: 7 },
    ],
    facilities: [
      { name: 'Epsilon3 HQ', type: 'headquarters', city: 'Los Angeles', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 65 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 48 },
      { scoreType: 'market_position', score: 45 },
      { scoreType: 'growth', score: 65 },
      { scoreType: 'momentum', score: 60 },
      { scoreType: 'overall', score: 57 },
    ],
  },

  // ── Cognitive Space ──
  {
    slug: 'cognitive-space',
    fundingRounds: [
      { date: '2022-06-01', amount: 8000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'ATX Venture Partners' },
    ],
    events: [
      { date: '2023-01-01', type: 'milestone', title: 'CNTIENT platform manages tasking for 50+ satellites', importance: 6 },
    ],
    facilities: [
      { name: 'Cognitive Space HQ', type: 'headquarters', city: 'Houston', state: 'TX', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 60 },
      { scoreType: 'team', score: 48 },
      { scoreType: 'funding', score: 35 },
      { scoreType: 'market_position', score: 38 },
      { scoreType: 'growth', score: 52 },
      { scoreType: 'momentum', score: 45 },
      { scoreType: 'overall', score: 46 },
    ],
  },

  // ── Pixxel ──
  {
    slug: 'pixxel',
    fundingRounds: [
      { date: '2024-01-01', amount: 36000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Google' },
      { date: '2022-03-01', amount: 25000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Radical Ventures' },
    ],
    events: [
      { date: '2024-03-01', type: 'milestone', title: 'Pixxel Firefly satellites achieve first-light hyperspectral imagery from orbit', importance: 8 },
      { date: '2024-01-01', type: 'funding', title: 'Google invests in $36M Series B for Pixxel hyperspectral constellation', importance: 7 },
    ],
    facilities: [
      { name: 'Pixxel HQ', type: 'headquarters', city: 'Bengaluru', country: 'IN' },
    ],
    scores: [
      { scoreType: 'technology', score: 70 },
      { scoreType: 'team', score: 60 },
      { scoreType: 'funding', score: 58 },
      { scoreType: 'market_position', score: 50 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 70 },
      { scoreType: 'overall', score: 63 },
    ],
  },

  // ── Skyroot Aerospace ──
  {
    slug: 'skyroot-aerospace',
    fundingRounds: [
      { date: '2023-06-01', amount: 51000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Temasek' },
      { date: '2022-01-01', amount: 40000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'GIC' },
    ],
    keyPersonnel: [
      { name: 'Naga Bharath Daka', title: 'Co-Founder & COO', role: 'founder', previousCompanies: ['ISRO'] },
    ],
    events: [
      { date: '2022-11-18', type: 'milestone', title: 'Vikram-S becomes India\'s first privately launched rocket', importance: 9 },
      { date: '2023-06-01', type: 'funding', title: 'Raises $51M Series C from Temasek for Vikram-1 development', importance: 7 },
    ],
    facilities: [
      { name: 'Skyroot HQ', type: 'headquarters', city: 'Hyderabad', country: 'IN' },
    ],
    scores: [
      { scoreType: 'technology', score: 65 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 60 },
      { scoreType: 'market_position', score: 50 },
      { scoreType: 'growth', score: 68 },
      { scoreType: 'momentum', score: 72 },
      { scoreType: 'overall', score: 62 },
    ],
  },

  // ── Agnikul Cosmos ──
  {
    slug: 'agnikul-cosmos',
    fundingRounds: [
      { date: '2023-04-01', amount: 26500000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Celesta Capital' },
    ],
    events: [
      { date: '2024-05-30', type: 'milestone', title: 'Agnibaan SOrTeD sub-orbital test flight — world-first single-piece 3D-printed engine in flight', importance: 9 },
    ],
    facilities: [
      { name: 'Agnikul HQ', type: 'headquarters', city: 'Chennai', country: 'IN' },
      { name: 'ISRO Sriharikota Launch Pad', type: 'launch_site', city: 'Sriharikota', country: 'IN' },
    ],
    scores: [
      { scoreType: 'technology', score: 62 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 48 },
      { scoreType: 'market_position', score: 40 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 65 },
      { scoreType: 'overall', score: 54 },
    ],
  },

  // ── GalaxEye ──
  {
    slug: 'galaxeye',
    fundingRounds: [
      { date: '2023-03-01', amount: 4500000, seriesLabel: 'Seed', roundType: 'seed' },
    ],
    events: [
      { date: '2023-03-01', type: 'funding', title: 'GalaxEye raises seed round for multi-sensor satellite development', importance: 5 },
    ],
    facilities: [
      { name: 'GalaxEye HQ', type: 'headquarters', city: 'Chennai', country: 'IN' },
    ],
    scores: [
      { scoreType: 'technology', score: 48 },
      { scoreType: 'team', score: 42 },
      { scoreType: 'funding', score: 25 },
      { scoreType: 'market_position', score: 28 },
      { scoreType: 'growth', score: 45 },
      { scoreType: 'momentum', score: 40 },
      { scoreType: 'overall', score: 38 },
    ],
  },

  // ── Gilmour Space ──
  {
    slug: 'gilmour-space',
    fundingRounds: [
      { date: '2022-12-01', amount: 47000000, seriesLabel: 'Series D', roundType: 'equity' },
      { date: '2021-03-01', amount: 26000000, seriesLabel: 'Series C', roundType: 'equity' },
    ],
    events: [
      { date: '2023-04-04', type: 'milestone', title: 'Eris rocket completes first full-duration static fire test', importance: 7 },
    ],
    facilities: [
      { name: 'Gilmour Space HQ', type: 'headquarters', city: 'Gold Coast', country: 'AU' },
      { name: 'Bowen Launch Facility', type: 'launch_site', city: 'Bowen', country: 'AU' },
    ],
    scores: [
      { scoreType: 'technology', score: 52 },
      { scoreType: 'team', score: 50 },
      { scoreType: 'funding', score: 55 },
      { scoreType: 'market_position', score: 42 },
      { scoreType: 'growth', score: 52 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 50 },
    ],
  },

  // ── Spaceflight Inc ──
  {
    slug: 'spaceflight-inc',
    fundingRounds: [
      { date: '2018-03-01', amount: 150000000, seriesLabel: 'Acquisition', roundType: 'acquisition', leadInvestor: 'Acquired by Firefly Aerospace' },
    ],
    products: [
      { name: 'Spaceflight Mission Management', category: 'service', description: 'End-to-end rideshare mission planning, integration, and management.', status: 'active' },
    ],
    events: [
      { date: '2023-04-15', type: 'milestone', title: 'Spaceflight arranges deployment of 100+ satellites on single Transporter mission', importance: 7 },
    ],
    facilities: [
      { name: 'Spaceflight Inc HQ', type: 'headquarters', city: 'Seattle', state: 'WA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 55 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 48 },
      { scoreType: 'market_position', score: 58 },
      { scoreType: 'growth', score: 48 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 52 },
    ],
  },

  // ── NanoAvionics ──
  {
    slug: 'nanoavionics',
    products: [
      { name: 'M12P Satellite Bus', category: 'satellite_bus', description: '12U-16U microsatellite bus for larger payloads.', status: 'active' },
    ],
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'NanoAvionics satellites deployed on 50+ missions worldwide', importance: 6 },
    ],
    facilities: [
      { name: 'NanoAvionics HQ', type: 'headquarters', city: 'Vilnius', country: 'LT' },
      { name: 'NanoAvionics UK', type: 'office', city: 'Didcot', country: 'GB' },
    ],
    scores: [
      { scoreType: 'technology', score: 60 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 38 },
      { scoreType: 'market_position', score: 52 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 52 },
      { scoreType: 'overall', score: 52 },
    ],
  },

  // ── EnduroSat ──
  {
    slug: 'endurosat',
    fundingRounds: [
      { date: '2023-01-01', amount: 10000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    events: [
      { date: '2023-06-01', type: 'milestone', title: 'EnduroSat shared satellite service hosts 10 customer payloads on single platform', importance: 6 },
    ],
    facilities: [
      { name: 'EnduroSat HQ', type: 'headquarters', city: 'Sofia', country: 'BG' },
    ],
    scores: [
      { scoreType: 'technology', score: 58 },
      { scoreType: 'team', score: 48 },
      { scoreType: 'funding', score: 35 },
      { scoreType: 'market_position', score: 42 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 48 },
    ],
  },

  // ── AAC Clyde Space ──
  {
    slug: 'aac-clyde-space',
    revenueEstimates: [
      { year: 2023, revenue: 30000000, revenueRange: '25-35M SEK', source: 'Nasdaq First North filings', confidenceLevel: 'estimate' },
      { year: 2022, revenue: 25000000, revenueRange: '20-30M SEK', source: 'Nasdaq First North filings', confidenceLevel: 'estimate' },
    ],
    events: [
      { date: '2023-12-01', type: 'milestone', title: 'AAC Clyde Space delivers EPIC satellite bus for ESA Copernicus mission', importance: 7 },
    ],
    facilities: [
      { name: 'AAC HQ', type: 'headquarters', city: 'Uppsala', country: 'SE' },
      { name: 'Clyde Space Factory', type: 'manufacturing', city: 'Glasgow', country: 'GB' },
    ],
    scores: [
      { scoreType: 'technology', score: 60 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 42 },
      { scoreType: 'market_position', score: 52 },
      { scoreType: 'growth', score: 50 },
      { scoreType: 'momentum', score: 48 },
      { scoreType: 'overall', score: 51 },
    ],
  },

  // ── PLD Space ──
  {
    slug: 'pld-space',
    fundingRounds: [
      { date: '2023-06-01', amount: 25000000, seriesLabel: 'Series C', roundType: 'equity' },
      { date: '2021-06-01', amount: 24000000, seriesLabel: 'Series B', roundType: 'equity' },
    ],
    keyPersonnel: [
      { name: 'Raul Verdú', title: 'Co-Founder & CTO', role: 'founder' },
    ],
    events: [
      { date: '2023-10-07', type: 'milestone', title: 'MIURA 1 suborbital rocket launched successfully from Huelva, Spain', importance: 9 },
    ],
    facilities: [
      { name: 'PLD Space HQ & Factory', type: 'headquarters', city: 'Elche', country: 'ES' },
      { name: 'El Arenosillo Launch Site', type: 'launch_site', city: 'Huelva', country: 'ES' },
    ],
    scores: [
      { scoreType: 'technology', score: 58 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 52 },
      { scoreType: 'market_position', score: 45 },
      { scoreType: 'growth', score: 60 },
      { scoreType: 'momentum', score: 68 },
      { scoreType: 'overall', score: 56 },
    ],
  },

  // ── Turion Space ──
  {
    slug: 'turion-space',
    fundingRounds: [
      { date: '2024-02-01', amount: 20000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Marlinspike Partners' },
    ],
    events: [
      { date: '2024-11-01', type: 'milestone', title: 'DROID.001 satellite launched for proximity operations demo mission', importance: 7 },
    ],
    facilities: [
      { name: 'Turion Space HQ', type: 'headquarters', city: 'Irvine', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 50 },
      { scoreType: 'team', score: 48 },
      { scoreType: 'funding', score: 40 },
      { scoreType: 'market_position', score: 35 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 52 },
      { scoreType: 'overall', score: 46 },
    ],
  },

  // ── K2 Space ──
  {
    slug: 'k2-space',
    fundingRounds: [
      { date: '2024-06-01', amount: 50000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'a16z' },
    ],
    keyPersonnel: [
      { name: 'Jonathan Hofeller', title: 'Co-Founder', role: 'founder', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2024-06-01', type: 'funding', title: 'Raises $50M Series A from a16z for large satellite platform', importance: 7 },
    ],
    facilities: [
      { name: 'K2 Space HQ', type: 'headquarters', city: 'Los Angeles', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 50 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 48 },
      { scoreType: 'market_position', score: 35 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 52 },
      { scoreType: 'overall', score: 49 },
    ],
  },

  // ── Inversion Space ──
  {
    slug: 'inversion-space',
    fundingRounds: [
      { date: '2023-06-01', amount: 44000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'ACME Capital' },
    ],
    events: [
      { date: '2023-06-01', type: 'funding', title: 'Raises $44M Series A for orbital cargo delivery capsule', importance: 7 },
    ],
    facilities: [
      { name: 'Inversion Space HQ', type: 'headquarters', city: 'Torrance', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 48 },
      { scoreType: 'team', score: 52 },
      { scoreType: 'funding', score: 45 },
      { scoreType: 'market_position', score: 32 },
      { scoreType: 'growth', score: 55 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 47 },
    ],
  },

  // ── Hadrian ──
  {
    slug: 'hadrian',
    fundingRounds: [
      { date: '2024-01-01', amount: 117000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'Andreessen Horowitz' },
      { date: '2022-08-01', amount: 90000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Lux Capital' },
    ],
    keyPersonnel: [
      { name: 'Chris Moehle', title: 'CTO', role: 'executive', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2024-01-01', type: 'funding', title: 'Raises $117M Series C from a16z to expand autonomous factories', importance: 8 },
      { date: '2023-06-01', type: 'milestone', title: 'First Hadrian autonomous factory reaches full production capacity', importance: 7 },
    ],
    facilities: [
      { name: 'Hadrian HQ & Factory 1', type: 'headquarters', city: 'Torrance', state: 'CA', country: 'US' },
      { name: 'Hadrian Factory 2', type: 'manufacturing', city: 'Los Angeles', state: 'CA', country: 'US' },
    ],
    contracts: [
      { agency: 'Department of Defense', title: 'Aerospace Component Manufacturing', value: 50000000, awardDate: '2023-09-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 72 },
      { scoreType: 'team', score: 68 },
      { scoreType: 'funding', score: 78 },
      { scoreType: 'market_position', score: 55 },
      { scoreType: 'growth', score: 82 },
      { scoreType: 'momentum', score: 80 },
      { scoreType: 'overall', score: 72 },
    ],
  },

  // ── Ursa Major ──
  {
    slug: 'ursa-major',
    fundingRounds: [
      { date: '2023-09-01', amount: 138000000, seriesLabel: 'Series D', roundType: 'equity', leadInvestor: 'L3Harris Technologies' },
      { date: '2022-02-01', amount: 85000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'XN / BlackRock' },
    ],
    products: [
      { name: 'Arroway', category: 'rocket_engine', description: 'Liquid oxygen/kerosene engine producing 200,000+ lbf thrust for defense and commercial launch.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Adam Harris', title: 'CFO', role: 'executive', previousCompanies: ['Raytheon'] },
    ],
    events: [
      { date: '2023-09-01', type: 'funding', title: 'Raises $138M Series D from L3Harris to scale propulsion production', importance: 8 },
      { date: '2024-06-01', type: 'milestone', title: 'Hadley engine enters series production for multiple defense programs', importance: 8 },
    ],
    facilities: [
      { name: 'Ursa Major HQ & Engine Factory', type: 'headquarters', city: 'Berthoud', state: 'CO', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Responsive Launch Propulsion Program', value: 25000000, awardDate: '2023-01-01' },
      { agency: 'Department of Defense', title: 'Solid Rocket Motor Independence Program', value: 30000000, awardDate: '2022-06-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 75 },
      { scoreType: 'team', score: 65 },
      { scoreType: 'funding', score: 78 },
      { scoreType: 'market_position', score: 60 },
      { scoreType: 'growth', score: 75 },
      { scoreType: 'momentum', score: 78 },
      { scoreType: 'overall', score: 72 },
    ],
  },

  // ── X-Bow Systems ──
  {
    slug: 'x-bow-systems',
    fundingRounds: [
      { date: '2023-06-01', amount: 56000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Crosscut Ventures' },
      { date: '2021-10-01', amount: 20000000, seriesLabel: 'Series A', roundType: 'equity' },
    ],
    events: [
      { date: '2023-06-01', type: 'funding', title: 'Raises $56M Series B for responsive launch vehicle development', importance: 7 },
      { date: '2024-01-01', type: 'milestone', title: 'Full-scale 3D-printed solid rocket motor static fire test', importance: 7 },
    ],
    facilities: [
      { name: 'X-Bow HQ', type: 'headquarters', city: 'Albuquerque', state: 'NM', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'Tactically Responsive Space Launch', value: 15000000, awardDate: '2022-09-01' },
    ],
    scores: [
      { scoreType: 'technology', score: 60 },
      { scoreType: 'team', score: 55 },
      { scoreType: 'funding', score: 58 },
      { scoreType: 'market_position', score: 42 },
      { scoreType: 'growth', score: 62 },
      { scoreType: 'momentum', score: 58 },
      { scoreType: 'overall', score: 56 },
    ],
  },

  // ── Starfish Space ──
  {
    slug: 'starfish-space',
    fundingRounds: [
      { date: '2023-04-01', amount: 14000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Munich Re Ventures' },
    ],
    events: [
      { date: '2024-06-01', type: 'milestone', title: 'Otter Pup demo spacecraft launched for proximity operations test', importance: 7 },
    ],
    facilities: [
      { name: 'Starfish Space HQ', type: 'headquarters', city: 'Kent', state: 'WA', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 52 },
      { scoreType: 'team', score: 50 },
      { scoreType: 'funding', score: 38 },
      { scoreType: 'market_position', score: 35 },
      { scoreType: 'growth', score: 52 },
      { scoreType: 'momentum', score: 50 },
      { scoreType: 'overall', score: 46 },
    ],
  },

  // ── ThinkOrbital ──
  {
    slug: 'thinkorbital',
    fundingRounds: [
      { date: '2022-09-01', amount: 5000000, seriesLabel: 'Seed', roundType: 'seed' },
    ],
    events: [
      { date: '2023-01-01', type: 'milestone', title: 'Completes automated welding demonstration for in-space construction', importance: 6 },
    ],
    facilities: [
      { name: 'ThinkOrbital HQ', type: 'headquarters', city: 'Broomfield', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 40 },
      { scoreType: 'team', score: 45 },
      { scoreType: 'funding', score: 22 },
      { scoreType: 'market_position', score: 25 },
      { scoreType: 'growth', score: 38 },
      { scoreType: 'momentum', score: 35 },
      { scoreType: 'overall', score: 34 },
    ],
  },

  // ── Rogue Space Systems ──
  {
    slug: 'rogue-space-systems',
    fundingRounds: [
      { date: '2022-06-01', amount: 3200000, seriesLabel: 'Seed', roundType: 'seed' },
    ],
    events: [
      { date: '2023-06-12', type: 'milestone', title: 'Barry-1 satellite launched on SpaceX Transporter-8', importance: 7 },
    ],
    facilities: [
      { name: 'Rogue Space Systems HQ', type: 'headquarters', city: 'Laconia', state: 'NH', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 42 },
      { scoreType: 'team', score: 40 },
      { scoreType: 'funding', score: 20 },
      { scoreType: 'market_position', score: 28 },
      { scoreType: 'growth', score: 42 },
      { scoreType: 'momentum', score: 45 },
      { scoreType: 'overall', score: 36 },
    ],
  },

  // ── Space Perspective ──
  {
    slug: 'space-perspective',
    fundingRounds: [
      { date: '2023-06-01', amount: 40000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Industrious Ventures' },
      { date: '2021-06-01', amount: 40000000, seriesLabel: 'Series A', roundType: 'equity', leadInvestor: 'Prime Movers Lab' },
    ],
    keyPersonnel: [
      { name: 'Taber MacCallum', title: 'Co-Founder & Co-CEO', role: 'founder', previousCompanies: ['World View', 'Paragon Space Development'] },
    ],
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'Neptune capsule completes 9th successful uncrewed test flight', importance: 7 },
      { date: '2023-06-01', type: 'funding', title: 'Raises $40M Series B with $100M+ in ticket reservations', importance: 7 },
    ],
    facilities: [
      { name: 'Space Perspective HQ', type: 'headquarters', city: 'Titusville', state: 'FL', country: 'US' },
      { name: 'Kennedy Space Center Operations', type: 'launch_site', city: 'Merritt Island', state: 'FL', country: 'US' },
    ],
    scores: [
      { scoreType: 'technology', score: 55 },
      { scoreType: 'team', score: 65 },
      { scoreType: 'funding', score: 55 },
      { scoreType: 'market_position', score: 48 },
      { scoreType: 'growth', score: 58 },
      { scoreType: 'momentum', score: 62 },
      { scoreType: 'overall', score: 57 },
    ],
  },

  // ── Isar Aerospace ──
  {
    slug: 'isar-aerospace',
    fundingRounds: [
      { date: '2024-03-01', amount: 165000000, seriesLabel: 'Series C', roundType: 'equity', leadInvestor: 'HV Capital' },
      { date: '2022-07-01', amount: 75000000, seriesLabel: 'Series B', roundType: 'equity', leadInvestor: 'Lombard Odier' },
    ],
    keyPersonnel: [
      { name: 'Josef Fleischmann', title: 'Co-Founder & CTO', role: 'founder', previousCompanies: ['TUM (Technical University of Munich)'] },
      { name: 'Markus Brandl', title: 'Co-Founder & COO', role: 'founder' },
    ],
    events: [
      { date: '2024-03-01', type: 'funding', title: 'Raises $165M Series C to prepare Spectrum for maiden flight', importance: 8 },
      { date: '2024-01-01', type: 'milestone', title: 'Full Spectrum rocket stage hot-fire test completed at Esrange', importance: 8 },
    ],
    facilities: [
      { name: 'Isar Aerospace HQ & Factory', type: 'headquarters', city: 'Ottobrunn', country: 'DE' },
      { name: 'Esrange Launch Site', type: 'launch_site', city: 'Kiruna', country: 'SE' },
    ],
    scores: [
      { scoreType: 'technology', score: 68 },
      { scoreType: 'team', score: 62 },
      { scoreType: 'funding', score: 78 },
      { scoreType: 'market_position', score: 50 },
      { scoreType: 'growth', score: 72 },
      { scoreType: 'momentum', score: 75 },
      { scoreType: 'overall', score: 67 },
    ],
  },

  // ── Terran Orbital ──
  {
    slug: 'terran-orbital',
    fundingRounds: [
      { date: '2024-03-25', amount: 450000000, seriesLabel: 'Acquisition', roundType: 'acquisition', leadInvestor: 'Lockheed Martin acquires Terran Orbital' },
    ],
    events: [
      { date: '2024-03-25', type: 'acquisition', title: 'Lockheed Martin acquires Terran Orbital for ~$450M', importance: 9 },
      { date: '2022-03-28', type: 'ipo', title: 'Terran Orbital goes public via SPAC on NYSE', importance: 7 },
    ],
    facilities: [
      { name: 'Terran Orbital HQ & Factory', type: 'headquarters', city: 'Boca Raton', state: 'FL', country: 'US' },
      { name: 'Irvine Satellite Facility', type: 'manufacturing', city: 'Irvine', state: 'CA', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Development Agency', title: 'Tranche 0 Tracking Layer Satellites', value: 178000000, awardDate: '2020-10-01' },
      { agency: 'Space Development Agency', title: 'Tranche 1 Tracking Layer', value: 290000000, awardDate: '2022-06-01' },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 95000000, source: 'SEC filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 48000000, source: 'SEC filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'technology', score: 68 },
      { scoreType: 'team', score: 60 },
      { scoreType: 'funding', score: 72 },
      { scoreType: 'market_position', score: 62 },
      { scoreType: 'growth', score: 65 },
      { scoreType: 'momentum', score: 68 },
      { scoreType: 'overall', score: 66 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Starting company profile enrichment...\n');

  console.log('── Enriching TIER 2 Companies ──');
  for (const data of TIER_2_ENRICHMENTS) {
    await enrichCompany(data);
  }

  console.log('\n── Enriching TIER 3 Companies ──');
  for (const data of TIER_3_ENRICHMENTS) {
    await enrichCompany(data);
  }

  // Print summary
  const totalCompanies = await prisma.companyProfile.count();
  const totalRounds = await prisma.fundingRound.count();
  const totalProducts = await prisma.companyProduct.count();
  const totalPersonnel = await prisma.keyPersonnel.count();
  const totalEvents = await prisma.companyEvent.count();
  const totalContracts = await prisma.governmentContractAward.count();
  const totalFacilities = await prisma.facilityLocation.count();
  const totalScores = await prisma.companyScore.count();

  console.log(`\n📊 Database Summary:`);
  console.log(`  Companies: ${totalCompanies}`);
  console.log(`  Funding Rounds: ${totalRounds}`);
  console.log(`  Products: ${totalProducts}`);
  console.log(`  Key Personnel: ${totalPersonnel}`);
  console.log(`  Events: ${totalEvents}`);
  console.log(`  Contracts: ${totalContracts}`);
  console.log(`  Facilities: ${totalFacilities}`);
  console.log(`  Scores: ${totalScores}`);

  console.log('\n✅ Enrichment complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
