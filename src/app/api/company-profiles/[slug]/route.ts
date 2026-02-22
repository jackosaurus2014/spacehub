import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const company: any = await (prisma.companyProfile as any).findUnique({
      where: { slug },
      include: {
        fundingRounds: {
          orderBy: { date: 'desc' },
        },
        revenueEstimates: {
          orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
        },
        products: {
          orderBy: { name: 'asc' },
        },
        keyPersonnel: {
          where: { isCurrent: true },
          orderBy: { name: 'asc' },
        },
        acquisitions: {
          orderBy: { date: 'desc' },
        },
        acquisitionsOf: {
          orderBy: { date: 'desc' },
        },
        partnerships: {
          orderBy: { announcedDate: 'desc' },
        },
        secFilings: {
          orderBy: { filingDate: 'desc' },
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
          orderBy: { awardDate: 'desc' },
          take: 20,
        },
        events: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        satelliteAssets: {
          orderBy: { launchDate: 'desc' },
        },
        facilities: {
          orderBy: { type: 'asc' },
        },
        scores: true,
      },
    });

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
    logger.error('Failed to fetch company profile', {
      error: errMsg,
      errorType: errName,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Include diagnostic info so production errors are actionable
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
