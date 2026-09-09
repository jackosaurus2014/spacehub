import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculateCompletenessBreakdown } from '@/lib/company-completeness';
import type { CompanyForScoring } from '@/lib/company-completeness';
import { satelliteAssetSignalAvailable } from '@/lib/satellite-signal';
import { getLiveQuoteSafe } from '@/lib/stock-quote';

/**
 * Company profile payload, shared by /api/company-profiles/[slug] (GET) and
 * the server-rendered /company-profiles/[slug] page (2026-09-09). The page
 * used to fetch this from the browser after a titled shell, so a slow or
 * rate-limited API left visitors and crawlers with an error card where the
 * profile belonged. Returns null when the slug does not exist; throws when
 * every query shape fails.
 */
const CORE_SCALAR_SELECT = {
  id: true,
  slug: true,
  name: true,
  legalName: true,
  ticker: true,
  exchange: true,
  headquarters: true,
  country: true,
  foundedYear: true,
  employeeCount: true,
  employeeRange: true,
  website: true,
  description: true,
  longDescription: true,
  analystNote: true,
  logoUrl: true,
  ceo: true,
  cto: true,
  linkedinUrl: true,
  twitterUrl: true,
  isPublic: true,
  marketCap: true,
  stockPrice: true,
  status: true,
  sector: true,
  subsector: true,
  tags: true,
  tier: true,
  totalFunding: true,
  lastFundingRound: true,
  valuation: true,
  revenueEstimate: true,
  ownershipType: true,
  parentCompany: true,
  dataCompleteness: true,
  verificationLevel: true,
  contactEmail: true,
  claimedByUserId: true,
  priceChange24h: true,
  lastVerified: true,
};

// Newer fields added in later versions — may not exist if db push failed
const EXTENDED_SCALAR_SELECT = {
  ...CORE_SCALAR_SELECT,
  sponsorTier: true,
  sponsorTagline: true,
  sponsorBanner: true,
};

// Shared relation includes for both full and fallback queries
const RELATION_SELECT = {
  fundingRounds: {
    orderBy: { date: 'desc' as const },
  },
  revenueEstimates: {
    orderBy: [{ year: 'desc' as const }, { quarter: 'desc' as const }],
  },
  products: {
    orderBy: { name: 'asc' as const },
  },
  keyPersonnel: {
    where: { isCurrent: true },
    orderBy: { name: 'asc' as const },
  },
  acquisitions: {
    orderBy: { date: 'desc' as const },
  },
  acquisitionsOf: {
    orderBy: { date: 'desc' as const },
  },
  partnerships: {
    orderBy: { announcedDate: 'desc' as const },
  },
  secFilings: {
    orderBy: { filingDate: 'desc' as const },
    take: 10,
  },
  competitorOf: {
    include: {
      competitor: {
        select: { id: true, slug: true, name: true, logoUrl: true, sector: true },
      },
    },
  },
  contracts: {
    orderBy: { awardDate: 'desc' as const },
    take: 20,
  },
  events: {
    orderBy: { date: 'desc' as const },
    take: 30,
  },
  satelliteAssets: {
    orderBy: { launchDate: 'desc' as const },
  },
  facilities: {
    orderBy: { type: 'asc' as const },
  },
  scores: true,
  _count: {
    select: {
      jobPostings: { where: { isActive: true } },
    },
  },
};

export type CompanyProfileData = Record<string, unknown> & { slug: string; name: string };

export async function getCompanyProfileData(slug: string): Promise<CompanyProfileData | null> {
  const db = prisma.companyProfile as any;

  let company: any = null;

  // Try full query first (with all fields including newer sponsor fields)
  try {
    company = await db.findUnique({
      where: { slug },
      select: { ...EXTENDED_SCALAR_SELECT, ...RELATION_SELECT },
    });
  } catch (fullErr) {
    // Full query failed — likely a missing column from a failed db push.
    // Fall back to core fields only.
    logger.warn('Full company profile query failed, trying core fields', {
      error: fullErr instanceof Error ? fullErr.message : String(fullErr),
      slug,
    });

    try {
      company = await db.findUnique({
        where: { slug },
        select: { ...CORE_SCALAR_SELECT, ...RELATION_SELECT },
      });
    } catch (coreErr) {
      // Core query also failed — try absolute minimal (no relations)
      logger.warn('Core company profile query failed, trying minimal', {
        error: coreErr instanceof Error ? coreErr.message : String(coreErr),
        slug,
      });

      try {
        company = await db.findUnique({
          where: { slug },
          select: CORE_SCALAR_SELECT,
        });
        // Add empty arrays for missing relations
        if (company) {
          company.fundingRounds = [];
          company.revenueEstimates = [];
          company.products = [];
          company.keyPersonnel = [];
          company.acquisitions = [];
          company.acquisitionsOf = [];
          company.partnerships = [];
          company.secFilings = [];
          company.competitorOf = [];
          company.contracts = [];
          company.events = [];
          company.satelliteAssets = [];
          company.facilities = [];
          company.scores = [];
          company._count = { jobPostings: 0 };
        }
      } catch (minErr) {
        // Even minimal query failed — real database issue
        const errMsg = minErr instanceof Error ? minErr.message : String(minErr);
        const errName = minErr instanceof Error ? minErr.constructor.name : 'Unknown';
        logger.error('All company profile queries failed', {
          error: errMsg,
          errorType: errName,
          slug,
        });
        throw new Error(`[${errName}] ${errMsg.slice(0, 300)}`);
      }
    }
  }

  if (!company) {
    return null;
  }

  // Prefer a live Yahoo Finance quote over the (potentially months-stale)
  // DB fields for public companies with a ticker. getLiveQuoteSafe has its
  // own short timeout + circuit breaker and never throws -- on any failure
  // we fall back to the DB values and label them with lastVerified so the
  // UI can be honest about staleness instead of silently rendering old
  // numbers as if they were current.
  let stockDataSource: 'live' | 'db' = 'db';
  let stockDataAsOf: string | null = company.lastVerified
    ? new Date(company.lastVerified).toISOString()
    : null;

  if (company.isPublic && company.ticker) {
    const liveQuote = await getLiveQuoteSafe(company.ticker);
    if (liveQuote) {
      company.stockPrice = liveQuote.stockPrice;
      if (liveQuote.marketCap !== null) company.marketCap = liveQuote.marketCap;
      if (liveQuote.priceChange24h !== null) company.priceChange24h = liveQuote.priceChange24h;
      stockDataSource = 'live';
      stockDataAsOf = new Date().toISOString();
    }
  }

  // Calculate summary stats
  const totalContractValue = (company.contracts || []).reduce(
    (sum: number, c: { value?: number | null }) => sum + (c.value || 0), 0
  );
  const activeSatellites = (company.satelliteAssets || []).filter(
    (s: { status: string }) => s.status === 'active'
  ).length;
  const totalFundingRounds = (company.fundingRounds || []).length;

  // Compute live completeness breakdown from already-loaded data.
  // Build a synthetic _count from relation array lengths to avoid an extra DB query.
  let completenessBreakdown = null;
  try {
    const companyForScoring: CompanyForScoring = {
      name: company.name,
      slug: company.slug,
      description: company.description,
      longDescription: company.longDescription,
      ceo: company.ceo,
      headquarters: company.headquarters,
      country: company.country,
      website: company.website,
      foundedYear: company.foundedYear,
      employeeCount: company.employeeCount,
      employeeRange: company.employeeRange,
      sector: company.sector,
      tags: company.tags,
      linkedinUrl: company.linkedinUrl,
      twitterUrl: company.twitterUrl,
      totalFunding: company.totalFunding,
      marketCap: company.marketCap,
      revenueEstimate: company.revenueEstimate,
      ticker: company.ticker,
      exchange: company.exchange,
      isPublic: company.isPublic,
      _count: {
        fundingRounds: (company.fundingRounds || []).length,
        revenueEstimates: (company.revenueEstimates || []).length,
        products: (company.products || []).length,
        keyPersonnel: (company.keyPersonnel || []).length,
        facilities: (company.facilities || []).length,
        satelliteAssets: (company.satelliteAssets || []).length,
        contracts: (company.contracts || []).length,
        events: (company.events || []).length,
        partnerships: (company.partnerships || []).length,
        acquisitions: (company.acquisitions || []).length,
        scores: (company.scores || []).length,
        secFilings: (company.secFilings || []).length,
        competitorOf: (company.competitorOf || []).length,
        newsArticles: (company.newsArticles || []).length,
      },
    };
    completenessBreakdown = calculateCompletenessBreakdown(companyForScoring, {
      satelliteSignalAvailable: await satelliteAssetSignalAvailable(),
    });
  } catch (scoringErr) {
    logger.warn('Failed to compute completeness breakdown', {
      error: scoringErr instanceof Error ? scoringErr.message : String(scoringErr),
      slug,
    });
  }

  // G9 (2026-09-01): leadership moves. ExecutiveMove carries a companySlug
  // string (no relation) plus free-text company names — match either. Low
  // volume by nature (extractor live since 8/24); try/catch so the profile
  // never 500s over a side table.
  let executiveMoves: unknown[] = [];
  try {
    executiveMoves = await prisma.executiveMove.findMany({
      where: {
        OR: [
          { companySlug: slug },
          { toCompany: { equals: company.name, mode: 'insensitive' } },
          { fromCompany: { equals: company.name, mode: 'insensitive' } },
        ],
      },
      orderBy: { date: 'desc' },
      take: 10,
    });
  } catch { /* section stays empty */ }

  return {
    ...company,
    executiveMoves,
    stockDataSource,
    stockDataAsOf,
    jobPostingsCount: company._count?.jobPostings ?? 0,
    summary: {
      totalContractValue,
      activeSatellites,
      totalSatellites: (company.satelliteAssets || []).length,
      totalFundingRounds,
      totalProducts: (company.products || []).length,
      totalPersonnel: (company.keyPersonnel || []).length,
      totalFacilities: (company.facilities || []).length,
      totalEvents: (company.events || []).length,
      competitors: (company.competitorOf || []).map((c: { competitor: unknown }) => c.competitor),
    },
    completenessBreakdown,
  };
}
