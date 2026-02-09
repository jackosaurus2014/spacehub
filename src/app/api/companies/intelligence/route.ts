import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  internalError,
  validationError,
} from '@/lib/errors';
import { companyProfileQuerySchema, validateSearchParams } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const validation = validateSearchParams(companyProfileQuerySchema, searchParams);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { search, sector, status, isPublic, limit, offset } = validation.data;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ticker: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sector) {
      where.sector = sector;
    }

    if (status) {
      where.status = status;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const [companies, total] = await Promise.all([
      prisma.companyProfile.findMany({
        where,
        select: {
          id: true,
          name: true,
          legalName: true,
          ticker: true,
          headquarters: true,
          isPublic: true,
          status: true,
          sector: true,
          subsector: true,
          employeeCount: true,
          website: true,
          logoUrl: true,
          ceo: true,
          cto: true,
          description: true,
          cageCode: true,
          samUei: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              fundingRounds: true,
              products: true,
              keyPersonnel: true,
              revenueEstimates: true,
              contracts: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.companyProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        companies,
        total,
        hasMore: offset + companies.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch company intelligence profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch company profiles');
  }
}
