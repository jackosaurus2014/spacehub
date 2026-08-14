import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { generateWeeklyHiringPost } from '@/lib/weekly-hiring-report';
import { mirrorInsightAsBrief } from '@/lib/published-briefs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/whos-hiring-post
 *
 * Weekly cron that publishes the data-driven "Who's Hiring in Space" brief
 * as a published AI-insight article. No AI calls — pure DB aggregation over
 * SpaceJobPosting.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (matches other cron routes).
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const report = await generateWeeklyHiringPost();

    const existing = await prisma.aIInsight.findUnique({ where: { slug: report.slug } });
    if (existing) {
      // Mirror even on the skip path — idempotent upsert — so re-running
      // after the PublishedBrief table ships backfills the brief hub too.
      await mirrorInsightAsBrief({
        id: existing.id,
        slug: existing.slug,
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        publishedAt: existing.generatedAt,
        briefType: 'hiring',
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
        category: 'market',
        sources: JSON.stringify([
          { title: 'SpaceNexus live job data', url: 'https://spacenexus.us/space-talent' },
        ]),
        status: 'published',
        factCheckNote: 'Data brief generated directly from SpaceNexus job-posting database aggregates — no generative content.',
      },
    });

    // Additive mirror into the unified brief hub (src/lib/published-briefs.ts).
    // Guarded internally against the PublishedBrief table not existing yet —
    // never breaks this cron.
    await mirrorInsightAsBrief({
      id: created.id,
      slug: created.slug,
      title: created.title,
      summary: created.summary,
      content: created.content,
      publishedAt: created.generatedAt,
      briefType: 'hiring',
    });

    logger.info("Weekly who's hiring post published", { slug: created.slug });

    return NextResponse.json({
      success: true,
      slug: created.slug,
      title: created.title,
      url: `/ai-insights/${created.slug}`,
    });
  } catch (error) {
    logger.error("Weekly who's hiring post failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate weekly who's hiring post" }, { status: 500 });
  }
}
