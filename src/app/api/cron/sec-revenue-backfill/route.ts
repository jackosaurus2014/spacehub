import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractAnnualRevenue, buildTickerCikMap, hasExchangeSuffix, type SecTickerRow, type SecCompanyFacts } from '@/lib/sec-revenue';

// Three years of annual revenue for public companies, from 10-K filings
// (SYNTHESIS.md item 35). Keyless SEC EDGAR APIs only — no API key required,
// but EDGAR requires a descriptive User-Agent and asks for a light touch
// (we stay well under its ~10 req/s guidance with a 150ms gap, sequential).
//
// Idempotent: safe to trigger repeatedly. RevenueEstimate has
// @@unique([companyId, year, quarter]), but `quarter` is nullable and
// Postgres treats NULL as distinct in unique constraints, so a Prisma
// `upsert` against that compound key would not reliably match existing
// annual (quarter: null) rows across runs — it would insert a fresh row
// each time instead of updating. We use findFirst + create/update instead.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const USER_AGENT = 'SpaceNexus research bot contact@spacenexus.us';
const REQUEST_GAP_MS = 150;
const FETCH_TIMEOUT_MS = 20_000;
const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const companyFactsUrl = (cik10: string) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function secFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`SEC EDGAR ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

// Module-scope cache of ticker -> zero-padded CIK, built once per cold
// start / run. company_tickers.json is a few MB and changes rarely, so a
// single fetch per invocation (not per company) is the whole point.
let tickerCikMap: Map<string, string> | null = null;

async function getTickerCikMap(): Promise<Map<string, string>> {
  if (tickerCikMap) return tickerCikMap;
  const body = (await secFetchJson(TICKERS_URL)) as Record<string, SecTickerRow>;
  tickerCikMap = buildTickerCikMap(body);
  return tickerCikMap;
}

const SOURCE = 'SEC EDGAR 10-K (XBRL companyfacts)';

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const started = Date.now();
  const errors: { ticker: string; error: string }[] = [];
  let updated = 0;
  let skippedNoCik = 0;
  let skippedNoRevenue = 0;

  const companies = await prisma.companyProfile.findMany({
    where: { ticker: { not: null } },
    select: { id: true, ticker: true },
  });

  const eligible = companies.filter(
    (c): c is typeof c & { ticker: string } => !!c.ticker && !hasExchangeSuffix(c.ticker)
  );

  let cikMap: Map<string, string>;
  try {
    cikMap = await getTickerCikMap();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('sec-revenue-backfill: company_tickers.json fetch failed', { error: message });
    return NextResponse.json(
      { success: false, companies: eligible.length, updated: 0, skippedNoCik: 0, skippedNoRevenue: 0, errors: [{ ticker: '*', error: message }] },
      { status: 502 }
    );
  }

  for (let i = 0; i < eligible.length; i++) {
    const company = eligible[i];
    const ticker = company.ticker.toUpperCase();

    if (i > 0) await sleep(REQUEST_GAP_MS);

    const cik = cikMap.get(ticker);
    if (!cik) {
      skippedNoCik++;
      continue;
    }

    try {
      const facts = (await secFetchJson(companyFactsUrl(cik))) as SecCompanyFacts;
      const annual = extractAnnualRevenue(facts, 3);

      if (annual.length === 0) {
        skippedNoRevenue++;
        continue;
      }

      for (const point of annual) {
        const existing = await prisma.revenueEstimate.findFirst({
          where: { companyId: company.id, year: point.fiscalYear, quarter: null },
          select: { id: true },
        });

        if (existing) {
          await prisma.revenueEstimate.update({
            where: { id: existing.id },
            data: {
              revenue: point.revenue,
              source: SOURCE,
              confidenceLevel: 'reported',
              notes: `us-gaap:${point.tag}, accn ${point.accn}, filed ${point.filedDate}`,
            },
          });
        } else {
          await prisma.revenueEstimate.create({
            data: {
              companyId: company.id,
              year: point.fiscalYear,
              quarter: null,
              revenue: point.revenue,
              source: SOURCE,
              confidenceLevel: 'reported',
              notes: `us-gaap:${point.tag}, accn ${point.accn}, filed ${point.filedDate}`,
            },
          });
        }
      }

      // annual[] is most-recent-first (see extractAnnualRevenue).
      const mostRecent = annual[0];
      if (mostRecent?.revenue != null) {
        await prisma.companyProfile.update({
          where: { id: company.id },
          data: { revenueEstimate: mostRecent.revenue },
        });
      }

      updated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ ticker, error: message });
      logger.warn('sec-revenue-backfill: company failed', { ticker, cik, error: message });
    }
  }

  const result = {
    success: errors.length === 0,
    companies: eligible.length,
    updated,
    skippedNoCik,
    skippedNoRevenue,
    errors,
  };

  logger.info('sec-revenue-backfill: done', { ...result, ms: Date.now() - started });
  return NextResponse.json(result);
}
