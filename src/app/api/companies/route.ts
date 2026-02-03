import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const isPublic = searchParams.get('isPublic');
    const focusArea = searchParams.get('focusArea');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (country) {
      where.country = country;
    }

    if (isPublic !== null && isPublic !== '') {
      where.isPublic = isPublic === 'true';
    }

    if (focusArea) {
      where.focusAreas = {
        contains: focusArea,
      };
    }

    const [companies, total] = await Promise.all([
      prisma.spaceCompany.findMany({
        where,
        orderBy: [
          { isPublic: 'desc' },
          { marketCap: 'desc' },
          { valuation: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.spaceCompany.count({ where }),
    ]);

    // Parse JSON fields
    const parsedCompanies = companies.map((company) => ({
      ...company,
      focusAreas: JSON.parse(company.focusAreas),
      subSectors: company.subSectors ? JSON.parse(company.subSectors) : null,
    }));

    return NextResponse.json({
      companies: parsedCompanies,
      total,
      hasMore: offset + companies.length < total,
    });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
