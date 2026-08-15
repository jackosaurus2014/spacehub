import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getLiveQuotesBatch } from '@/lib/stock-quote';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/cron/stock-sync
 *
 * Daily (weekday, after US market close) sync of CompanyProfile.stockPrice /
 * marketCap / priceChange24h from live Yahoo Finance quotes, for every
 * public company with a ticker.
 *
 * Fixes the stock-price split-brain: /company-profiles/[slug] and the
 * /api/companies/stats aggregate ("Market Cap Tracked") were built from
 * static CompanyProfile fields that went stale for months, while /api/stocks
 * served live quotes for the same tickers elsewhere on the site. This job
 * keeps the DB fields themselves current so every reader of CompanyProfile
 * (not just the profile page, which also does a render-time live lookup)
 * gets accurate numbers, and so the site stays correct even if the Yahoo
 * Finance API is briefly down at render time.
 *
 * Unquotable/foreign/delisted tickers are skipped with a warning rather than
 * failing the whole run — see mapQuoteToProfileFields in src/lib/stock-quote.ts.
 *
 * Auth: Bearer ${CRON_SECRET}.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const companies = await prisma.companyProfile.findMany({
      where: { isPublic: true, ticker: { not: null } },
      select: { id: true, slug: true, ticker: true },
    });

    const validCompanies = companies.filter((c) => c.ticker && c.ticker.trim().length > 0);
    const tickers = validCompanies.map((c) => c.ticker as string);

    const quotes = await getLiveQuotesBatch(tickers);

    let updated = 0;
    const skipped: string[] = [];
    const failed: { ticker: string; slug: string; error: string }[] = [];

    for (const company of validCompanies) {
      const ticker = (company.ticker as string).trim().toUpperCase();
      const fields = quotes.get(ticker);

      if (!fields) {
        skipped.push(`${ticker} (${company.slug})`);
        continue;
      }

      try {
        await prisma.companyProfile.update({
          where: { id: company.id },
          data: {
            stockPrice: fields.stockPrice,
            // Only overwrite marketCap/priceChange24h when Yahoo actually
            // returned a value for them -- undefined tells Prisma to leave
            // the existing field untouched rather than nulling it out.
            marketCap: fields.marketCap ?? undefined,
            priceChange24h: fields.priceChange24h ?? undefined,
            lastVerified: new Date(),
          },
        });
        updated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        failed.push({ ticker, slug: company.slug, error: msg });
        logger.warn('stock-sync: failed to update company profile', {
          ticker,
          slug: company.slug,
          error: msg,
        });
      }
    }

    logger.info('stock-sync cron completed', {
      total: validCompanies.length,
      updated,
      skipped: skipped.length,
      failed: failed.length,
    });

    return NextResponse.json({
      success: true,
      total: validCompanies.length,
      updated,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('stock-sync cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
