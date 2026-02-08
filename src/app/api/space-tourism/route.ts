export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  SPACE_TOURISM_OFFERINGS as FALLBACK_OFFERINGS,
  ExperienceType,
  TourismStatus,
  SpaceTourismOffering,
} from '@/lib/space-tourism-data';
import { getModuleContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

function applyFilters(
  allOfferings: SpaceTourismOffering[],
  options?: {
    provider?: string;
    experienceType?: ExperienceType;
    minPrice?: number;
    maxPrice?: number;
    status?: TourismStatus;
  }
): SpaceTourismOffering[] {
  let results = [...allOfferings];
  if (options?.provider) {
    results = results.filter((o) => o.provider === options.provider);
  }
  if (options?.experienceType) {
    results = results.filter((o) => o.experienceType === options.experienceType);
  }
  if (options?.minPrice !== undefined) {
    results = results.filter((o) => o.price !== null && o.price >= options.minPrice!);
  }
  if (options?.maxPrice !== undefined) {
    results = results.filter((o) => o.price !== null && o.price <= options.maxPrice!);
  }
  if (options?.status) {
    results = results.filter((o) => o.status === options.status);
  }
  return results;
}

export async function GET(request: Request) {
  try {
    // Try to load tourism data from DynamicContent, fall back to hardcoded data
    let allOfferings: SpaceTourismOffering[] = FALLBACK_OFFERINGS;
    try {
      const dynamicData = await getModuleContent<SpaceTourismOffering>('space-tourism', 'offerings');
      if (dynamicData.length > 0) {
        allOfferings = dynamicData.map((item) => item.data);
      }
    } catch {
      // DynamicContent unavailable, use fallback data
    }

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
    const offerings = applyFilters(allOfferings, {
      provider,
      experienceType,
      minPrice,
      maxPrice,
      status,
    });

    // Calculate stats
    const totalOfferings = allOfferings.length;
    const activeOfferings = allOfferings.filter(o => o.status === 'active').length;
    const pricesWithValues = allOfferings.filter(o => o.price !== null).map(o => o.price as number);
    const lowestPrice = pricesWithValues.length > 0 ? Math.min(...pricesWithValues) : null;
    const highestPrice = pricesWithValues.length > 0 ? Math.max(...pricesWithValues) : null;

    // Count by experience type
    const experienceTypeCounts = allOfferings.reduce((acc, o) => {
      acc[o.experienceType] = (acc[o.experienceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by provider
    const providerCounts = allOfferings.reduce((acc, o) => {
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
