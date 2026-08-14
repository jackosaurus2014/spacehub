import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import prisma from '@/lib/db';
import { internalError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { deriveFocusAreas, toLegacyCountry } from '@/lib/company-roster';

export const dynamic = 'force-dynamic';

const usdToBillions = (usd: number | null): number | null =>
  usd === null ? null : usd / 1_000_000_000;

/**
 * GET /api/v1/market
 * Public API: Fetch space company market/stock data.
 * Backed by CompanyProfile (single source of truth); marketCap is returned in
 * billions USD for continuity with the original SpaceCompany-backed response.
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
      const company = await prisma.companyProfile.findFirst({
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
          sector: true,
          subsector: true,
          tags: true,
        },
      });

      if (!company) {
        return validationError(`No company found with ticker "${ticker}"`);
      }

      const response = NextResponse.json({
        success: true,
        data: {
          id: company.id,
          name: company.name,
          ticker: company.ticker,
          exchange: company.exchange,
          marketCap: usdToBillions(company.marketCap),
          stockPrice: company.stockPrice,
          priceChange24h: company.priceChange24h,
          isPublic: company.isPublic,
          country: toLegacyCountry(company.country),
          focusAreas: deriveFocusAreas(company.sector, company.subsector, company.tags),
        },
      });

      return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
    }

    // All public companies
    const companies = await prisma.companyProfile.findMany({
      where: { isPublic: true, ticker: { not: null }, NOT: { status: 'defunct' } },
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
      orderBy: { marketCap: { sort: 'desc', nulls: 'last' } },
    });

    const data = companies.map((c) => ({
      id: c.id,
      name: c.name,
      ticker: c.ticker,
      exchange: c.exchange,
      marketCap: usdToBillions(c.marketCap),
      stockPrice: c.stockPrice,
      priceChange24h: c.priceChange24h,
      country: toLegacyCountry(c.country),
    }));

    const response = NextResponse.json({
      success: true,
      data,
      pagination: { limit: data.length, offset: 0, total: data.length },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/market error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch market data');
  }
}
