import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// Core scalar fields that have existed since the initial company profiles schema.
// These are safe to query even if recent prisma db push deployments failed.
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
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: `Failed to fetch company profile: [${errName}] ${errMsg.slice(0, 300)}`,
              },
            },
            { status: 500 }
          );
        }
      }
    }

    if (!company) {
      return notFoundError('Company profile');
    }

    // Calculate summary stats
    const totalContractValue = (company.contracts || []).reduce(
      (sum: number, c: { value?: number | null }) => sum + (c.value || 0), 0
    );
    const activeSatellites = (company.satelliteAssets || []).filter(
      (s: { status: string }) => s.status === 'active'
    ).length;
    const totalFundingRounds = (company.fundingRounds || []).length;

    return NextResponse.json({
      ...company,
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
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'Unknown';
    logger.error('Failed to fetch company profile (outer)', {
      error: errMsg,
      errorType: errName,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to fetch company profile: [${errName}] ${errMsg.slice(0, 300)}`,
        },
      },
      { status: 500 }
    );
  }
}
