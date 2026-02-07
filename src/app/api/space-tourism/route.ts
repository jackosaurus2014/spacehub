export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  SPACE_TOURISM_OFFERINGS,
  filterOfferings,
  ExperienceType,
  TourismStatus,
} from '@/lib/space-tourism-data';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract filter parameters
    const provider = searchParams.get('provider') || undefined;
    const experienceType = (searchParams.get('experienceType') || undefined) as ExperienceType | undefined;
    const status = (searchParams.get('status') || undefined) as TourismStatus | undefined;
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');

    const minPrice = minPriceParam ? parseInt(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? parseInt(maxPriceParam) : undefined;

    // Filter offerings based on parameters
    const offerings = filterOfferings({
      provider,
      experienceType,
      minPrice,
      maxPrice,
      status,
    });

    // Calculate stats
    const totalOfferings = SPACE_TOURISM_OFFERINGS.length;
    const activeOfferings = SPACE_TOURISM_OFFERINGS.filter(o => o.status === 'active').length;
    const pricesWithValues = SPACE_TOURISM_OFFERINGS.filter(o => o.price !== null).map(o => o.price as number);
    const lowestPrice = pricesWithValues.length > 0 ? Math.min(...pricesWithValues) : null;
    const highestPrice = pricesWithValues.length > 0 ? Math.max(...pricesWithValues) : null;

    // Count by experience type
    const experienceTypeCounts = SPACE_TOURISM_OFFERINGS.reduce((acc, o) => {
      acc[o.experienceType] = (acc[o.experienceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by provider
    const providerCounts = SPACE_TOURISM_OFFERINGS.reduce((acc, o) => {
      acc[o.provider] = (acc[o.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      offerings,
      stats: {
        totalOfferings,
        activeOfferings,
        lowestPrice,
        highestPrice,
        experienceTypeCounts,
        providerCounts,
      },
      filters: {
        provider,
        experienceType,
        minPrice,
        maxPrice,
        status,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch space tourism data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch space tourism data' },
      { status: 500 }
    );
  }
}
