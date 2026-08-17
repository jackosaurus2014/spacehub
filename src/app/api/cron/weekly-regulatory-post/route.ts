import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildWeeklyRegulatoryBrief } from '@/lib/weekly-regulatory-brief';
import { mirrorInsightAsBrief } from '@/lib/published-briefs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/weekly-regulatory-post
 *
 * Weekly cron (Mondays 14:30 UTC, see src/lib/cron-scheduler.ts) that
 * publishes the data-driven "Regulatory Radar" brief as a published
 * AI-insight article. No AI calls — pure DB aggregation over the
 * RegulatoryAction table. Modeled on weekly-economy-post.
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

    const report = await buildWeeklyRegulatoryBrief();

    // Nothing tracked this week (or the RegulatoryAction table isn't
    // migrated yet) — skip honestly rather than publishing an empty brief.
    if (!report) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No regulatory actions to report this week',
      });
    }

    const existing = await prisma.aIInsight.findUnique({ where: { slug: report.slug } });
    if (existing) {
      // Mirror even on the skip path — idempotent upsert — so re-running
      // still backfills the brief hub.
      await mirrorInsightAsBrief({
        id: existing.id,
        slug: existing.slug,
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        publishedAt: existing.generatedAt,
        briefType: 'regulatory',
      });
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
        category: 'regulatory',
        sources: JSON.stringify([
          { title: 'SpaceNexus Regulatory Radar tracking data', url: 'https://spacenexus.us/regulatory-radar' },
          { title: 'Federal Register API', url: 'https://www.federalregister.gov/developers/documentation/api/v1' },
        ]),
        status: 'published',
        factCheckNote: 'Data brief generated directly from SpaceNexus Regulatory Radar database aggregates — no generative content.',
      },
    });

    // Additive mirror into the unified brief hub — guarded internally, never
    // breaks this cron.
    await mirrorInsightAsBrief({
      id: created.id,
      slug: created.slug,
      title: created.title,
      summary: created.summary,
      content: created.content,
      publishedAt: created.generatedAt,
      briefType: 'regulatory',
    });

    logger.info('Weekly regulatory post published', { slug: created.slug });

    return NextResponse.json({
      success: true,
      slug: created.slug,
      title: created.title,
      url: `/ai-insights/${created.slug}`,
    });
  } catch (error) {
    logger.error('Weekly regulatory post failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to generate weekly regulatory post' }, { status: 500 });
  }
}
