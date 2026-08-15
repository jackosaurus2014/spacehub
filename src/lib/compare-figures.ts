/**
 * DB-driven financial figures for /compare/* pages.
 *
 * Problem: ~50 compare pages used to hardcode market cap / valuation / funding
 * totals in prose and tables. Those numbers drift (stock-sync cron updates
 * CompanyProfile.marketCap/stockPrice daily; funding rounds land in the DB
 * too) and a sampled page was caught 4x off. This module is the single place
 * that reads those figures out of CompanyProfile so /compare pages never
 * hardcode a number that can go stale.
 *
 * Usage in a page (server component):
 *
 *   export const dynamic = 'force-dynamic'; // Railway build container has no DB access
 *
 *   const figures = await getCompareFigures(['rocket-lab', 'spacex']);
 *   const rocketLab = figures['rocket-lab'];
 *   ...
 *   <td>{rocketLab ? formatMarketCap(rocketLab.marketCapUSD) : '~$12B (early 2026)'}</td>
 *   ...
 *   <CompareFiguresFootnote figures={Object.values(figures)} />
 */

import prisma from '@/lib/db';

export interface CompareFigure {
  slug: string;
  name: string;
  isPublic: boolean;
  ticker: string | null;
  marketCapUSD: number | null;
  stockPrice: number | null;
  valuationUSD: number | null;
  totalFundingUSD: number | null;
  lastVerified: Date | null;
}

/** Map of requested slug -> figure. Missing/unknown slugs are simply absent
 *  from the map (callers should fall back to a labeled hardcoded figure). */
export type CompareFiguresMap = Record<string, CompareFigure>;

const SELECT = {
  slug: true,
  name: true,
  isPublic: true,
  ticker: true,
  marketCap: true,
  stockPrice: true,
  valuation: true,
  totalFunding: true,
  lastVerified: true,
} as const;

/**
 * Fetch financial figures for a set of CompanyProfile slugs.
 * Never throws on a DB miss for an individual slug — only a DB connection
 * failure throws, in which case callers should let the page's hardcoded
 * fallbacks stand (this fn returns {} on failure).
 */
export async function getCompareFigures(slugs: string[]): Promise<CompareFiguresMap> {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  if (uniqueSlugs.length === 0) return {};

  try {
    const rows = await prisma.companyProfile.findMany({
      where: { slug: { in: uniqueSlugs } },
      select: SELECT,
    });

    const map: CompareFiguresMap = {};
    for (const row of rows) {
      map[row.slug] = {
        slug: row.slug,
        name: row.name,
        isPublic: row.isPublic,
        ticker: row.ticker,
        marketCapUSD: row.marketCap,
        stockPrice: row.stockPrice,
        valuationUSD: row.valuation,
        totalFundingUSD: row.totalFunding,
        lastVerified: row.lastVerified,
      };
    }
    return map;
  } catch {
    // Build-time/DB-unavailable safety net. Pages using this helper should
    // also set `export const dynamic = 'force-dynamic'` so this path is rare
    // in practice (only hit on genuine DB outages at request time).
    return {};
  }
}

// ─── Formatters ─────────────────────────────────────────────────────────────

/** 51_300_000_000 -> "$51.3B", 850_000_000 -> "$850M", null -> null */
export function formatMarketCap(usd: number | null | undefined): string | null {
  if (usd === null || usd === undefined || Number.isNaN(usd)) return null;
  const abs = Math.abs(usd);
  const sign = usd < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Alias — valuation and total funding use the same compact-currency shape. */
export const formatValuation = formatMarketCap;
export const formatFundingTotal = formatMarketCap;

/** 4.215 -> "$4.22", null -> null */
export function formatStockPrice(usd: number | null | undefined): string | null {
  if (usd === null || usd === undefined || Number.isNaN(usd)) return null;
  return `$${usd.toFixed(2)}`;
}

/** "2026-08-14T00:00:00Z" -> "Aug 14, 2026"; null -> "unverified" */
export function formatAsOfDate(date: Date | null | undefined): string {
  if (!date) return 'unverified';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ─── Figure selection ───────────────────────────────────────────────────────

export type CompareFigureField = 'marketCap' | 'valuation' | 'totalFunding' | 'stockPrice';

/**
 * Pick the best available headline figure for a company: public companies
 * show market cap (falling back to valuation if marketCap hasn't synced
 * yet), private companies show their last-known valuation, falling back to
 * total funding raised if no valuation is on file.
 */
export function selectHeadlineFigure(figure: CompareFigure | undefined | null): {
  field: CompareFigureField;
  label: string;
  formatted: string;
} | null {
  if (!figure) return null;

  if (figure.isPublic) {
    if (figure.marketCapUSD != null) {
      return { field: 'marketCap', label: 'Market Cap', formatted: formatMarketCap(figure.marketCapUSD)! };
    }
    if (figure.valuationUSD != null) {
      return { field: 'valuation', label: 'Valuation', formatted: formatValuation(figure.valuationUSD)! };
    }
  } else {
    if (figure.valuationUSD != null) {
      return { field: 'valuation', label: 'Valuation', formatted: formatValuation(figure.valuationUSD)! };
    }
    if (figure.totalFundingUSD != null) {
      return { field: 'totalFunding', label: 'Total Funding', formatted: formatFundingTotal(figure.totalFundingUSD)! };
    }
  }
  return null;
}

/**
 * Render a "Market Cap / Valuation" style combined string for a compare-table
 * row, mirroring the prose convention used across /compare pages
 * (e.g. "~$12B (early 2026)"). Returns null if no figure is on file, so
 * callers can fall back to a labeled hardcoded value.
 */
export function formatMarketCapOrValuation(figure: CompareFigure | undefined | null): string | null {
  const headline = selectHeadlineFigure(figure);
  if (!headline) return null;
  return headline.formatted;
}
