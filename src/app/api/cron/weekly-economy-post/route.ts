import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildWeeklyEconomyReport } from '@/lib/weekly-economy-report';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/weekly-economy-post
 *
 * Weekly cron that publishes the data-driven "State of the Space Economy"
 * brief as a published AI-insight article. No AI calls — pure DB aggregation.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (matches other cron routes).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await buildWeeklyEconomyReport();

    const existing = await prisma.aIInsight.findUnique({ where: { slug: report.slug } });
    if (existing) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Report ${report.slug} already exists`,
      });
    }

    const created = await prisma.aIInsight.create({
      data: {
        title: report.title,
        slug: report.slug,
        summary: report.summary,
        content: report.content,
        category: 'market',
        sources: JSON.stringify([
          { title: 'SpaceNexus live tracking data', url: 'https://spacenexus.us/market-intel' },
        ]),
        status: 'published',
        factCheckNote: 'Data brief generated directly from SpaceNexus database aggregates — no generative content.',
      },
    });

    logger.info('Weekly economy post published', { slug: created.slug });

    return NextResponse.json({
      success: true,
      slug: created.slug,
      title: created.title,
      url: `/ai-insights/${created.slug}`,
    });
  } catch (error) {
    logger.error('Weekly economy post failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to generate weekly economy post' }, { status: 500 });
  }
}
