import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { internalError, notFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const company = await prisma.companyProfile.findUnique({
      where: { id },
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
          orderBy: [{ isCurrent: 'desc' }, { name: 'asc' }],
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
        partnerOf: {
          orderBy: { announcedDate: 'desc' },
        },
        secFilings: {
          orderBy: { filingDate: 'desc' },
        },
        competitorOf: {
          include: {
            competitor: {
              select: {
                id: true,
                name: true,
                sector: true,
                ticker: true,
              },
            },
          },
        },
        competitorTo: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                sector: true,
                ticker: true,
              },
            },
          },
        },
        contracts: {
          orderBy: { awardDate: 'desc' },
        },
      },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error) {
    logger.error('Failed to fetch company intelligence profile', {
      error: error instanceof Error ? error.message : String(error),
      id: params.id,
    });
    return internalError('Failed to fetch company profile');
  }
}
