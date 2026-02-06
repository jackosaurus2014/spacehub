export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCommodityPrices } from '@/lib/space-mining-data';
import { CommodityCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') as CommodityCategory | null;
    const sortBy = searchParams.get('sortBy') as 'price' | 'name' | 'production' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const commodities = await getCommodityPrices({
      category: category || undefined,
      limit,
      sortBy: sortBy || 'price',
      sortOrder: sortOrder || 'desc',
    });

    return NextResponse.json({
      commodities,
      total: commodities.length,
    });
  } catch (error) {
    console.error('Failed to fetch commodity prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commodity prices' },
      { status: 500 }
    );
  }
}
