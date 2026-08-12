import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// Widget data changes slowly (job counts) — cache for an hour at the CDN.
export const revalidate = 3600;

export async function GET() {
  try {
    const [totalActive, atPublicCompanies, topCompaniesRaw] = await Promise.all([
      prisma.spaceJobPosting.count({ where: { isActive: true } }),
      // "Public" companies are ones we've linked to a CompanyProfile flagged
      // isPublic (publicly traded). Everything else — including postings with
      // no linked profile — is bucketed as private/pre-IPO.
      prisma.spaceJobPosting.count({
        where: { isActive: true, companyProfile: { isPublic: true } },
      }),
      prisma.spaceJobPosting.groupBy({
        by: ['company'],
        where: { isActive: true },
        _count: { company: true },
        orderBy: { _count: { company: 'desc' } },
        take: 5,
      }),
    ]);

    const topCompanies = topCompaniesRaw.map((c) => ({
      name: c.company,
      count: c._count.company,
    }));

    return NextResponse.json(
      {
        totalActive,
        atPrivateCompanies: Math.max(0, totalActive - atPublicCompanies),
        topCompanies,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to load jobs widget data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        totalActive: 0,
        atPrivateCompanies: 0,
        topCompanies: [],
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } }
    );
  }
}
