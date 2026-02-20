import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { aggregateAllOpportunities, STATE_INCENTIVES } from '@/lib/funding/opportunity-fetcher';
import { logger } from '@/lib/logger';

// GET — search & filter opportunities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';
  const agency = searchParams.get('agency');
  const category = searchParams.get('category');
  const fundingType = searchParams.get('type');
  const stateOnly = searchParams.get('stateIncentive') === 'true';
  const search = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (agency) where.agency = { contains: agency, mode: 'insensitive' };
    if (category) where.categories = { has: category };
    if (fundingType) where.fundingType = fundingType;
    if (stateOnly) where.stateIncentive = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { agency: { contains: search, mode: 'insensitive' } },
        { program: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [opportunities, total] = await Promise.all([
      prisma.fundingOpportunity.findMany({
        where,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
        select: {
          id: true,
          externalId: true,
          title: true,
          description: true,
          agency: true,
          program: true,
          fundingType: true,
          amountMin: true,
          amountMax: true,
          totalBudget: true,
          deadline: true,
          openDate: true,
          status: true,
          eligibility: true,
          setAside: true,
          categories: true,
          applicationUrl: true,
          sourceUrl: true,
          source: true,
          stateIncentive: true,
          state: true,
          recurring: true,
        },
      }),
      prisma.fundingOpportunity.count({ where }),
    ]);

    return NextResponse.json({
      opportunities,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    logger.error('Failed to fetch funding opportunities', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

// POST — trigger refresh (cron endpoint)
export async function POST(request: NextRequest) {
  // Auth check for cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isLocalhost = request.headers.get('host')?.includes('localhost');
    if (!isLocalhost) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Fetch from all sources
    const opportunities = await aggregateAllOpportunities();

    // Add state incentives
    const allOpps = [...opportunities, ...STATE_INCENTIVES];

    let upserted = 0;
    let errors = 0;

    for (const opp of allOpps) {
      try {
        await prisma.fundingOpportunity.upsert({
          where: { externalId: opp.externalId },
          create: {
            externalId: opp.externalId,
            title: opp.title,
            description: opp.description,
            agency: opp.agency,
            program: opp.program,
            fundingType: opp.fundingType,
            amountMin: opp.amountMin,
            amountMax: opp.amountMax,
            totalBudget: opp.totalBudget,
            deadline: opp.deadline,
            openDate: opp.openDate,
            status: opp.status,
            eligibility: opp.eligibility,
            setAside: opp.setAside,
            categories: opp.categories,
            applicationUrl: opp.applicationUrl,
            sourceUrl: opp.sourceUrl,
            source: opp.source,
            contactName: opp.contactName,
            contactEmail: opp.contactEmail,
            naicsCode: opp.naicsCode,
            solicitationNumber: opp.solicitationNumber,
            stateIncentive: opp.stateIncentive || false,
            state: opp.state,
            recurring: opp.recurring || false,
          },
          update: {
            title: opp.title,
            description: opp.description,
            status: opp.status,
            deadline: opp.deadline,
            amountMin: opp.amountMin,
            amountMax: opp.amountMax,
            lastUpdated: new Date(),
          },
        });
        upserted++;
      } catch {
        errors++;
      }
    }

    // Close expired opportunities
    const expired = await prisma.fundingOpportunity.updateMany({
      where: {
        deadline: { lt: new Date() },
        status: 'open',
        recurring: false,
      },
      data: { status: 'closed' },
    });

    logger.info('Funding opportunities refresh complete', { upserted, errors, expiredClosed: expired.count });
    return NextResponse.json({ success: true, upserted, errors, expiredClosed: expired.count });
  } catch (error) {
    logger.error('Funding opportunity refresh failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
