/**
 * Commodity pricing fetcher for Resource Exchange module
 *
 * Fetches real-time metal and commodity prices from the Metals.dev API
 * (free tier: 100 req/month, no credit card). Falls back to World Bank
 * monthly data for historical context.
 *
 * Updates the SpaceResource earthPricePerKg for resources that have
 * matching commodity symbols, and stores price history in DynamicContent.
 */

import prisma from '@/lib/db';
import { upsertContent } from '@/lib/dynamic-content';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';

const metalsBreaker = createCircuitBreaker('metals-dev', {
  failureThreshold: 3,
  resetTimeout: 300_000, // 5 minutes
});

// Map resource slugs to their metal/commodity symbols
// Metals.dev uses standard commodity codes
const RESOURCE_COMMODITY_MAP: Record<string, {
  symbol: string;
  source: 'metals-dev' | 'static';
  category: 'precious' | 'base' | 'minor';
  pricePerUnit: 'troy_oz' | 'tonne' | 'kg';
}> = {
  'aluminum-6061-t6': { symbol: 'aluminum', source: 'metals-dev', category: 'base', pricePerUnit: 'tonne' },
  'titanium-6al-4v': { symbol: 'titanium', source: 'static', category: 'minor', pricePerUnit: 'kg' },
  'inconel-718': { symbol: 'nickel', source: 'metals-dev', category: 'base', pricePerUnit: 'tonne' },
  'oxygen-free-copper': { symbol: 'copper', source: 'metals-dev', category: 'base', pricePerUnit: 'tonne' },
  'stainless-steel-304l': { symbol: 'iron_ore', source: 'static', category: 'base', pricePerUnit: 'tonne' },
  'platinum': { symbol: 'platinum', source: 'metals-dev', category: 'precious', pricePerUnit: 'troy_oz' },
  'gold': { symbol: 'gold', source: 'metals-dev', category: 'precious', pricePerUnit: 'troy_oz' },
  'beryllium': { symbol: 'beryllium', source: 'static', category: 'minor', pricePerUnit: 'kg' },
  'tungsten': { symbol: 'tungsten', source: 'static', category: 'minor', pricePerUnit: 'kg' },
};

// Conversion factors
const TROY_OZ_TO_KG = 0.0311035; // 1 troy oz = 0.031 kg
const TONNE_TO_KG = 1000;

// Aerospace markup multipliers (commodity grade → aerospace/space-grade)
const AEROSPACE_MARKUP: Record<string, number> = {
  'aluminum-6061-t6': 3.5,    // Aerospace-grade aluminum ~3.5x LME
  'inconel-718': 8.0,         // Superalloy premium over nickel
  'oxygen-free-copper': 2.0,  // OFC premium over commodity copper
  'stainless-steel-304l': 4.0, // Space-grade stainless over raw iron
  'platinum': 1.0,            // Precious metals trade at market
  'gold': 1.0,
};

interface MetalsDevResponse {
  status: string;
  currency: string;
  unit: string;
  metals: Record<string, number>;
}

interface PriceUpdate {
  slug: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  source: string;
  commodity: string;
}

/**
 * Fetch current metal prices from Metals.dev API
 */
async function fetchMetalsPrices(): Promise<Record<string, number> | null> {
  const apiKey = process.env.METALS_DEV_API_KEY;
  if (!apiKey) {
    logger.warn('[Commodity] METALS_DEV_API_KEY not configured, using static prices');
    return null;
  }

  return metalsBreaker.execute(async () => {
    const response = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Metals.dev API error: ${response.status}`);
    }

    const data: MetalsDevResponse = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Metals.dev API returned status: ${data.status}`);
    }

    return data.metals;
  });
}

/**
 * Convert metal price to per-kg price based on unit
 */
function convertToPerKg(
  price: number,
  pricePerUnit: 'troy_oz' | 'tonne' | 'kg',
): number {
  switch (pricePerUnit) {
    case 'troy_oz':
      return price / TROY_OZ_TO_KG; // price per troy oz → price per kg
    case 'tonne':
      return price / TONNE_TO_KG;   // price per tonne → price per kg
    case 'kg':
      return price;
  }
}

/**
 * Main fetcher: updates SpaceResource prices from live commodity data
 */
export async function fetchAndUpdateCommodityPrices(): Promise<number> {
  const startTime = Date.now();
  const priceUpdates: PriceUpdate[] = [];

  try {
    const metalPrices = await fetchMetalsPrices();

    // Get all resources that have commodity mappings
    const mappedSlugs = Object.keys(RESOURCE_COMMODITY_MAP);
    const resources = await prisma.spaceResource.findMany({
      where: { slug: { in: mappedSlugs } },
      select: { id: true, slug: true, name: true, earthPricePerKg: true },
    });

    for (const resource of resources) {
      const mapping = RESOURCE_COMMODITY_MAP[resource.slug];
      if (!mapping) continue;

      // Only update from API if we have live prices and the source is metals-dev
      if (mapping.source === 'metals-dev' && metalPrices) {
        const rawPrice = metalPrices[mapping.symbol];
        if (rawPrice === undefined) {
          logger.warn(`[Commodity] No price found for ${mapping.symbol}`);
          continue;
        }

        // Convert to per-kg and apply aerospace markup
        const basePerKg = convertToPerKg(rawPrice, mapping.pricePerUnit);
        const markup = AEROSPACE_MARKUP[resource.slug] || 1.0;
        const newPrice = Math.round(basePerKg * markup * 100) / 100;

        const changePercent = resource.earthPricePerKg > 0
          ? ((newPrice - resource.earthPricePerKg) / resource.earthPricePerKg) * 100
          : 0;

        // Only update if price changed by more than 0.1%
        if (Math.abs(changePercent) > 0.1) {
          await prisma.spaceResource.update({
            where: { id: resource.id },
            data: {
              earthPricePerKg: newPrice,
              priceSource: `Metals.dev (${mapping.symbol} × ${markup}x aerospace markup)`,
            },
          });

          priceUpdates.push({
            slug: resource.slug,
            name: resource.name,
            oldPrice: resource.earthPricePerKg,
            newPrice,
            changePercent: Math.round(changePercent * 100) / 100,
            source: 'metals-dev',
            commodity: mapping.symbol,
          });
        }
      }
    }

    // Store price update history in DynamicContent
    if (priceUpdates.length > 0) {
      await upsertContent(
        'resource-exchange:price-updates',
        'resource-exchange',
        'price-updates',
        {
          updates: priceUpdates,
          fetchedAt: new Date().toISOString(),
          source: 'metals-dev',
          totalUpdated: priceUpdates.length,
        },
        {
          sourceType: 'api',
          sourceUrl: 'https://metals.dev',
        }
      );
    }

    // Also store a market summary snapshot
    const allResources = await prisma.spaceResource.findMany({
      select: { slug: true, name: true, earthPricePerKg: true, category: true, availability: true },
      orderBy: { category: 'asc' },
    });

    const categoryAverages: Record<string, { avg: number; count: number; resources: string[] }> = {};
    for (const r of allResources) {
      if (!categoryAverages[r.category]) {
        categoryAverages[r.category] = { avg: 0, count: 0, resources: [] };
      }
      categoryAverages[r.category].avg += r.earthPricePerKg;
      categoryAverages[r.category].count++;
      categoryAverages[r.category].resources.push(r.name);
    }
    for (const cat of Object.values(categoryAverages)) {
      cat.avg = Math.round((cat.avg / cat.count) * 100) / 100;
    }

    await upsertContent(
      'resource-exchange:market-snapshot',
      'resource-exchange',
      'market-snapshot',
      {
        totalResources: allResources.length,
        categoryAverages,
        priceUpdatesCount: priceUpdates.length,
        snapshotAt: new Date().toISOString(),
      },
      {
        sourceType: 'api',
        sourceUrl: 'https://metals.dev',
      }
    );

    const duration = Date.now() - startTime;
    logger.info('[Commodity] Price update complete', {
      updated: priceUpdates.length,
      total: resources.length,
      duration,
    });

    return priceUpdates.length;
  } catch (error) {
    logger.error('[Commodity] Price update failed', {
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    return 0;
  }
}
