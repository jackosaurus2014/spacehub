import { NextResponse } from 'next/server';
import { generateDailyDigest } from '@/lib/newsletter/digest-generator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Verify CRON_SECRET for protected access
  const { requireCronSecret } = await import('@/lib/errors');
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    logger.info('Starting daily digest generation');

    const result = await generateDailyDigest();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          newsCount: result.newsCount,
        },
        { status: result.newsCount === 0 ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Digest generated successfully',
      digestId: result.digestId,
      newsCount: result.newsCount,
      categories: result.categories,
      featureArticleCount: result.featureArticles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Digest generation error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Digest generation failed' },
      { status: 500 }
    );
  }
}
