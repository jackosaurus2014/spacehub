import { NextResponse } from 'next/server';
import { getModuleContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PriceUpdateData {
  updates: Array<{
    slug: string;
    name: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    source: string;
    commodity: string;
  }>;
  fetchedAt: string;
}

export async function GET() {
  try {
    const [priceContent, newsContent, commentaryContent] = await Promise.all([
      getModuleContent<PriceUpdateData>('resource-exchange', 'price-updates'),
      getModuleContent('resource-exchange', 'related-news'),
      getModuleContent('resource-exchange', 'market-commentary'),
    ]);

    const priceData = priceContent[0]?.data;

    return NextResponse.json({
      priceUpdates: priceData?.updates || [],
      pricesFetchedAt: priceData?.fetchedAt || null,
      relatedNews: newsContent[0]?.data || [],
      marketCommentary: commentaryContent[0]?.data || null,
    });
  } catch (error) {
    logger.error('Failed to fetch resource exchange dynamic content', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      priceUpdates: [],
      pricesFetchedAt: null,
      relatedNews: [],
      marketCommentary: null,
    });
  }
}
