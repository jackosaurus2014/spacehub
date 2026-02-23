import { NextRequest, NextResponse } from 'next/server';
import { findSimilarCompanies } from '@/lib/similar-companies';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 20);

    // First, look up the company ID from the slug
    const { default: prisma } = await import('@/lib/db');
    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const similar = await findSimilarCompanies(company.id, limit);

    return NextResponse.json({
      companies: similar,
      total: similar.length,
    });
  } catch (error) {
    logger.error('Similar companies API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch similar companies' },
      { status: 500 }
    );
  }
}
