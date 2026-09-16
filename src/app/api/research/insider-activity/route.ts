import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, validationError } from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import { form4CodeLabel, isDiscretionaryMarketTrade } from '@/lib/market-signals/form4-codes';
import { INSIDER_NOTICE } from '@/lib/research-report-insider';
import {
  INSIDER_DEFAULT_SINCE,
  SCHEDULE_13_STRUCTURED_SINCE,
} from '@/lib/fetchers/sec-insider-fetcher';

export const dynamic = 'force-dynamic';

const MAX_DAYS = 2000;
const MAX_COMPANIES = 25;
const MAX_ROWS = 5000;

/**
 * SEC-derived investor signals for specific companies, at row level.
 *
 * GATE: requireResearchAccess, server-side, before a single row is read. There
 * is no client-side check in this path and no query parameter that relaxes it.
 *
 * WHAT IS GATED AND WHAT IS NOT. The monthly Space Insider Activity release is
 * public at the top of every table — headline figures, methodology, coverage
 * limits and the first ten rows — so it is citable by people who will never
 * pay us. What Research buys is arbitrary slicing: pick your own companies,
 * your own window, and get every transaction line, every 5%-holder row and
 * every indexed filing behind them. That is the form a firm models against.
 *
 * NOT INVESTMENT ADVICE. Every response carries the notice, because a
 * disclaimer that lives only on a web page is a disclaimer that gets lost the
 * moment the JSON lands in somebody's notebook. Nothing in this handler
 * scores, rates, ranks by desirability or expresses a direction: it returns
 * what was filed, classified by the code the filer used.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const params = new URL(req.url).searchParams;
  const slugs = (params.get('companies') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const days = Math.min(MAX_DAYS, Math.max(1, parseInt(params.get('days') || '365', 10) || 365));
  const openMarketOnly = params.get('openMarketOnly') === 'true';

  if (slugs.length > MAX_COMPANIES) {
    return validationError(
      `At most ${MAX_COMPANIES} companies per request. Use the release export for a whole month across every company.`
    );
  }

  try {
    const since = new Date(Date.now() - days * 86_400_000);
    const companyFilter = slugs.length > 0 ? { companySlug: { in: slugs } } : {};

    const [transactions, positions, filings] = await Promise.all([
      prisma.insiderTransaction.findMany({
        where: { transactionDate: { gte: since }, ...companyFilter },
        orderBy: [{ transactionDate: 'desc' }, { accessionNumber: 'desc' }, { lineKey: 'asc' }],
        take: MAX_ROWS,
      }),
      prisma.institutionalPosition.findMany({
        where: { filingDate: { gte: since }, ...companyFilter },
        orderBy: [{ filingDate: 'desc' }, { accessionNumber: 'desc' }, { holderKey: 'asc' }],
        take: MAX_ROWS,
      }),
      prisma.issuerFiling.findMany({
        where: { filingDate: { gte: since }, ...companyFilter },
        orderBy: [{ filingDate: 'desc' }, { accessionNumber: 'desc' }],
        take: MAX_ROWS,
      }),
    ]);

    const tx = openMarketOnly
      ? transactions.filter((t) => isDiscretionaryMarketTrade(t.transactionCode))
      : transactions;

    return createSuccessResponse({
      notice: INSIDER_NOTICE,
      requestedDays: days,
      companies: slugs.length > 0 ? slugs : 'all covered issuers',
      openMarketOnly,
      counts: {
        transactions: tx.length,
        openMarketTransactions: transactions.filter((t) =>
          isDiscretionaryMarketTrade(t.transactionCode)
        ).length,
        institutionalPositions: positions.length,
        indexedFilings: filings.length,
        // Truthful about truncation rather than quietly returning a short list.
        truncated:
          transactions.length >= MAX_ROWS ||
          positions.length >= MAX_ROWS ||
          filings.length >= MAX_ROWS,
      },
      transactions: tx.map((t) => ({
        companySlug: t.companySlug,
        company: t.companyName,
        ticker: t.ticker,
        transactionDate: t.transactionDate.toISOString().slice(0, 10),
        filingDate: t.filingDate.toISOString().slice(0, 10),
        formType: t.formType,
        insider: t.ownerName,
        insiderTitle: t.ownerTitle,
        isDirector: t.isDirector,
        isOfficer: t.isOfficer,
        isTenPercentOwner: t.isTenPercentOwner,
        additionalOwners: t.additionalOwners,
        derivative: t.derivative,
        securityTitle: t.securityTitle,
        transactionCode: t.transactionCode,
        transactionCodeMeaning: form4CodeLabel(t.transactionCode),
        transactionClass: t.transactionClass,
        openMarketTrade: isDiscretionaryMarketTrade(t.transactionCode),
        acquiredDisposed: t.acquiredDisposed,
        shares: t.shares,
        pricePerShare: t.pricePerShare,
        valueUsd: t.valueUsd,
        sharesOwnedAfter: t.sharesOwnedAfter,
        directOrIndirect: t.directOrIndirect,
        footnotedOnFiling: t.footnoted,
        accessionNumber: t.accessionNumber,
        filingUrl: t.sourceUrl,
        documentUrl: t.documentUrl,
      })),
      institutionalPositions: positions.map((p) => ({
        companySlug: p.companySlug,
        company: p.companyName,
        ticker: p.ticker,
        filingDate: p.filingDate.toISOString().slice(0, 10),
        eventDate: p.eventDate ? p.eventDate.toISOString().slice(0, 10) : null,
        form: p.formType,
        isAmendment: p.isAmendment,
        isScheduleThirteenD: p.isActivistForm,
        holder: p.holderName,
        holderType: p.holderType,
        holderCitizenship: p.holderCitizenship,
        securitiesClass: p.securitiesClass,
        cusip: p.cusip,
        sharesBeneficiallyOwned: p.sharesBeneficiallyOwned,
        percentOfClass: p.percentOfClass,
        soleVoting: p.soleVoting,
        sharedVoting: p.sharedVoting,
        soleDispositive: p.soleDispositive,
        sharedDispositive: p.sharedDispositive,
        accessionNumber: p.accessionNumber,
        filingUrl: p.sourceUrl,
        documentUrl: p.documentUrl,
      })),
      filings: filings.map((f) => ({
        companySlug: f.companySlug,
        company: f.companyName,
        ticker: f.ticker,
        form: f.form,
        filingDate: f.filingDate.toISOString().slice(0, 10),
        reportDate: f.reportDate ? f.reportDate.toISOString().slice(0, 10) : null,
        items: f.items,
        isXBRL: f.isXBRL,
        accessionNumber: f.accessionNumber,
        filingUrl: f.sourceUrl,
      })),
      coverage: [
        `Parsed SEC history begins ${INSIDER_DEFAULT_SINCE}; earlier filings are a backfill boundary, not an absence of events.`,
        'Only codes P and S are open-market trades. Grants, tax withholding, exercises and gifts are returned with their own codes and are never folded into a purchase or sale count.',
        `Schedule 13D/G rows come only from structured XML submissions, which the SEC mandated from ${SCHEDULE_13_STRUCTURED_SINCE}.`,
        'Coverage is tracked companies with a ticker that resolves to an SEC filer. Private and foreign-listed space companies file none of these forms.',
        'Every row carries its accession number and a sec.gov URL. Verify anything you intend to rely on against the filing itself.',
      ],
    });
  } catch (error) {
    logger.error('Insider activity query failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not read SEC insider data.');
  }
}
