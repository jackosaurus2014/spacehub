import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { internalError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/market
 * Public API: Fetch space company market/stock data.
 *
 * Params: ticker (optional -- if provided, returns single company)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker') || undefined;

    if (ticker) {
      // Single company lookup
      const company = await prisma.spaceCompany.findFirst({
        where: { ticker: ticker.toUpperCase() },
        select: {
          id: true,
          name: true,
          ticker: true,
          exchange: true,
          marketCap: true,
          stockPrice: true,
          priceChange24h: true,
          isPublic: true,
          country: true,
          focusAreas: true,
        },
      });

      if (!company) {
        return validationError(`No company found with ticker "${ticker}"`);
      }

      const response = NextResponse.json({
        success: true,
        data: company,
      });

      return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
    }

    // All public companies
    const companies = await prisma.spaceCompany.findMany({
      where: { isPublic: true, ticker: { not: null } },
      select: {
        id: true,
        name: true,
        ticker: true,
        exchange: true,
        marketCap: true,
        stockPrice: true,
        priceChange24h: true,
        country: true,
      },
      orderBy: { marketCap: 'desc' },
    });

    const response = NextResponse.json({
      success: true,
      data: companies,
      pagination: { limit: companies.length, offset: 0, total: companies.length },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/market error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch market data');
  }
}
