import { NextResponse } from 'next/server';
import { generateDailyDigest } from '@/lib/newsletter/digest-generator';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Verify CRON_SECRET for protected access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting daily digest generation...');

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
    console.error('Digest generation error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
