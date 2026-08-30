import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  PRIME_COMPANIES,
  PRIME_AGENCIES,
  PAGE_SIZE,
  MAX_PAGES_PER_REQUEST,
  getLast3FiscalYearsRange,
  buildSpendingByAwardRequest,
  mapAwardToContract,
  type PrimeAgencyCode,
  type UsaSpendingAwardRow,
} from '@/lib/prime-contracts';

// Prime-contractor backfill (SYNTHESIS.md item 34, scoped to
// GovernmentContract only — no FundingRound work here). A visible zero on
// Lockheed/Boeing/Northrop/L3Harris's Contracts tab is the worst first
// impression for a BD-lead visitor; this pulls real PRIME space awards for
// the four flagship defense contractors from the keyless USAspending.gov
// `spending_by_award` search API and upserts them as GovernmentContract
// rows (idempotent by slug). See src/lib/prime-contracts.ts for the pure
// mapper/classifier (unit tested in
// src/lib/__tests__/prime-contracts-mapper.test.ts).
//
//   POST /api/cron/prime-contracts-backfill
//
// No DB access existed in the environment this was written in — every
// request/response shape here was confirmed against USAspending's own API
// docs (github.com/fedspendingtransparency/usaspending-api, api_contracts/
// contracts/v2/search/spending_by_award.md) rather than guessed, but the
// route itself has never executed against a live database. See the report
// for exactly what could and couldn't be verified.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const USASPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const REQUEST_DELAY_MS = 300;

interface UsaSpendingResponse {
  results?: UsaSpendingAwardRow[];
  page_metadata?: { hasNext?: boolean };
}

async function fetchAwardPage(
  recipientSearchText: string,
  agencyCode: PrimeAgencyCode,
  page: number
): Promise<UsaSpendingAwardRow[]> {
  const body = buildSpendingByAwardRequest(
    recipientSearchText,
    PRIME_AGENCIES[agencyCode],
    getLast3FiscalYearsRange(),
    page,
    PAGE_SIZE
  );

  const res = await fetch(USASPENDING_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`USAspending ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as UsaSpendingResponse;
  return json.results || [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CompanyResult {
  fetched: number;
  kept: number;
  upserted: number;
}

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const started = Date.now();
  const perCompany: Record<string, CompanyResult> = {};
  const errors: string[] = [];

  for (const company of PRIME_COMPANIES) {
    const result: CompanyResult = { fetched: 0, kept: 0, upserted: 0 };

    for (const agencyCode of Object.keys(PRIME_AGENCIES) as PrimeAgencyCode[]) {
      for (let page = 1; page <= MAX_PAGES_PER_REQUEST; page++) {
        await sleep(REQUEST_DELAY_MS);
        let rows: UsaSpendingAwardRow[];
        try {
          rows = await fetchAwardPage(company.searchText, agencyCode, page);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`${company.name}/${agencyCode}/page${page}: ${msg}`);
          logger.warn('prime-contracts-backfill: page fetch failed', {
            company: company.name,
            agency: agencyCode,
            page,
            error: msg,
          });
          break; // don't keep paging a company/agency that's erroring
        }

        result.fetched += rows.length;

        for (const row of rows) {
          const mapped = mapAwardToContract(row, company.name, agencyCode);
          if (!mapped) continue;
          result.kept++;
          try {
            await prisma.governmentContract.upsert({
              where: { slug: mapped.slug },
              create: mapped,
              update: mapped,
            });
            result.upserted++;
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(`${company.name}/${mapped.slug}: ${msg}`);
            logger.warn('prime-contracts-backfill: upsert failed', {
              slug: mapped.slug,
              company: company.name,
              error: msg,
            });
          }
        }

        // USAspending pages return up to PAGE_SIZE rows; fewer means we hit
        // the end of results for this company/agency combination.
        if (rows.length < PAGE_SIZE) break;
      }
    }

    perCompany[company.name] = result;
  }

  const totalUpserted = Object.values(perCompany).reduce((sum, r) => sum + r.upserted, 0);
  logger.info('prime-contracts-backfill: complete', {
    perCompany,
    errors: errors.length,
    totalUpserted,
    ms: Date.now() - started,
  });

  return NextResponse.json({
    success: errors.length === 0,
    perCompany,
    errors,
    timestamp: new Date().toISOString(),
  });
}
