import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const DEFAULT_SINCE_DAYS = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );
    const category = searchParams.get('category') || undefined;
    const company = searchParams.get('company') || undefined;
    const remoteOnly = searchParams.get('remote') === 'true';
    const sinceDays = Math.max(
      1,
      parseInt(searchParams.get('sinceDays') || String(DEFAULT_SINCE_DAYS), 10) || DEFAULT_SINCE_DAYS
    );

    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      isActive: true,
      postedDate: { gte: since },
    };
    if (category) where.category = category;
    if (company) where.company = { equals: company, mode: 'insensitive' };
    if (remoteOnly) where.remoteOk = true;

    const [postings, total] = await Promise.all([
      prisma.spaceJobPosting.findMany({
        where,
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          remoteOk: true,
          category: true,
          seniorityLevel: true,
          employmentType: true,
          salaryMin: true,
          salaryMax: true,
          postedDate: true,
          sourceUrl: true,
          companyProfile: { select: { slug: true, isPublic: true } },
        },
        orderBy: { postedDate: 'desc' },
        take: limit,
      }),
      prisma.spaceJobPosting.count({ where }),
    ]);

    const jobs = postings.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      companyProfileUrl: job.companyProfile
        ? `${APP_URL}/company-profiles/${job.companyProfile.slug}`
        : null,
      location: job.location,
      remoteOk: job.remoteOk,
      category: job.category,
      seniorityLevel: job.seniorityLevel,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      postedDate: job.postedDate.toISOString(),
      url: `${APP_URL}/space-talent/job/${job.id}`,
      applyUrl: job.sourceUrl,
    }));

    return NextResponse.json(
      {
        meta: {
          total,
          generatedAt: new Date().toISOString(),
          attribution: 'SpaceNexus — spacenexus.us',
          docs: `${APP_URL}/widgets`,
        },
        jobs,
      },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to build public jobs feed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        meta: {
          total: 0,
          generatedAt: new Date().toISOString(),
          attribution: 'SpaceNexus — spacenexus.us',
          docs: `${APP_URL}/widgets`,
        },
        jobs: [],
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
