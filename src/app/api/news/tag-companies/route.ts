import { NextRequest, NextResponse } from 'next/server';
import { tagRecentArticlesWithCompanies } from '@/lib/news-fetcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 2000);

    const tagged = await tagRecentArticlesWithCompanies(limit);

    return NextResponse.json({
      success: true,
      message: `Processed ${tagged} articles for company tagging`,
      articlesProcessed: tagged,
    });
  } catch (error) {
    logger.error('Error tagging articles with companies', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to tag articles with companies' },
      { status: 500 }
    );
  }
}
