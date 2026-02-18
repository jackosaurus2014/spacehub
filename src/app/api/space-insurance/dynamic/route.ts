import { NextResponse } from 'next/server';
import { getModuleContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [newsContent, blogsContent, commentaryContent] = await Promise.all([
      getModuleContent('space-insurance', 'related-news'),
      getModuleContent('space-insurance', 'related-blogs'),
      getModuleContent('space-insurance', 'market-commentary'),
    ]);

    return NextResponse.json({
      relatedNews: newsContent[0]?.data || [],
      relatedBlogs: blogsContent[0]?.data || [],
      marketCommentary: commentaryContent[0]?.data || null,
    });
  } catch (error) {
    logger.error('Failed to fetch insurance dynamic content', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      relatedNews: [],
      relatedBlogs: [],
      marketCommentary: null,
    });
  }
}
