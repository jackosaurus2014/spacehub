/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    companyProfile: { findMany: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import {
  getCompareFigures,
  formatMarketCap,
  formatValuation,
  formatFundingTotal,
  formatStockPrice,
  formatAsOfDate,
  selectHeadlineFigure,
  formatMarketCapOrValuation,
  type CompareFigure,
} from '@/lib/compare-figures';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('formatMarketCap / formatValuation / formatFundingTotal', () => {
  it('formats trillions', () => {
    expect(formatMarketCap(2_000_000_000_000)).toBe('$2.00T');
  });

  it('formats billions to one decimal', () => {
    expect(formatMarketCap(51_300_000_000)).toBe('$51.3B');
  });

  it('formats millions with no decimal', () => {
    expect(formatMarketCap(850_000_000)).toBe('$850M');
  });

  it('formats thousands', () => {
    expect(formatMarketCap(5_000)).toBe('$5K');
  });

  it('formats small values as whole dollars', () => {
    expect(formatMarketCap(500)).toBe('$500');
  });

  it('handles negative values', () => {
    expect(formatMarketCap(-1_000_000_000)).toBe('-$1.0B');
  });

  it('returns null for null/undefined/NaN', () => {
    expect(formatMarketCap(null)).toBeNull();
    expect(formatMarketCap(undefined)).toBeNull();
    expect(formatMarketCap(NaN)).toBeNull();
  });

  it('valuation and funding formatters are aliases of formatMarketCap', () => {
    expect(formatValuation(1_200_000_000)).toBe(formatMarketCap(1_200_000_000));
    expect(formatFundingTotal(50_000_000)).toBe(formatMarketCap(50_000_000));
  });
});

describe('formatStockPrice', () => {
  it('formats to 2 decimals with $ prefix', () => {
    expect(formatStockPrice(4.2)).toBe('$4.20');
    expect(formatStockPrice(123.456)).toBe('$123.46');
  });

  it('returns null for null/undefined', () => {
    expect(formatStockPrice(null)).toBeNull();
    expect(formatStockPrice(undefined)).toBeNull();
  });
});

describe('formatAsOfDate', () => {
  it('formats a date', () => {
    expect(formatAsOfDate(new Date('2026-08-14T00:00:00Z'))).toBe('Aug 14, 2026');
  });

  it('returns "unverified" for null/undefined', () => {
    expect(formatAsOfDate(null)).toBe('unverified');
    expect(formatAsOfDate(undefined)).toBe('unverified');
  });
});

function makeFigure(overrides: Partial<CompareFigure> = {}): CompareFigure {
  return {
    slug: 'test-co',
    name: 'Test Co',
    isPublic: false,
    ticker: null,
    marketCapUSD: null,
    stockPrice: null,
    valuationUSD: null,
    totalFundingUSD: null,
    lastVerified: null,
    ...overrides,
  };
}

describe('selectHeadlineFigure', () => {
  it('returns null for missing figure', () => {
    expect(selectHeadlineFigure(null)).toBeNull();
    expect(selectHeadlineFigure(undefined)).toBeNull();
  });

  it('public company prefers market cap', () => {
    const fig = makeFigure({ isPublic: true, marketCapUSD: 12_000_000_000, valuationUSD: 9_000_000_000 });
    const headline = selectHeadlineFigure(fig);
    expect(headline).toEqual({ field: 'marketCap', label: 'Market Cap', formatted: '$12.0B' });
  });

  it('public company without market cap falls back to valuation', () => {
    const fig = makeFigure({ isPublic: true, marketCapUSD: null, valuationUSD: 9_000_000_000 });
    const headline = selectHeadlineFigure(fig);
    expect(headline).toEqual({ field: 'valuation', label: 'Valuation', formatted: '$9.0B' });
  });

  it('private company prefers valuation', () => {
    const fig = makeFigure({ isPublic: false, valuationUSD: 600_000_000, totalFundingUSD: 50_000_000 });
    const headline = selectHeadlineFigure(fig);
    expect(headline).toEqual({ field: 'valuation', label: 'Valuation', formatted: '$600M' });
  });

  it('private company without valuation falls back to total funding', () => {
    const fig = makeFigure({ isPublic: false, valuationUSD: null, totalFundingUSD: 50_000_000 });
    const headline = selectHeadlineFigure(fig);
    expect(headline).toEqual({ field: 'totalFunding', label: 'Total Funding', formatted: '$50M' });
  });

  it('returns null when no usable figure exists', () => {
    const fig = makeFigure({ isPublic: true });
    expect(selectHeadlineFigure(fig)).toBeNull();
  });
});

describe('formatMarketCapOrValuation', () => {
  it('delegates to selectHeadlineFigure and returns the formatted string', () => {
    const fig = makeFigure({ isPublic: true, marketCapUSD: 51_300_000_000 });
    expect(formatMarketCapOrValuation(fig)).toBe('$51.3B');
  });

  it('returns null when no figure', () => {
    expect(formatMarketCapOrValuation(makeFigure({ isPublic: true }))).toBeNull();
  });
});

describe('getCompareFigures', () => {
  it('returns empty map for empty input without querying the DB', async () => {
    const result = await getCompareFigures([]);
    expect(result).toEqual({});
    expect(mockPrisma.companyProfile.findMany).not.toHaveBeenCalled();
  });

  it('dedupes slugs and queries once', async () => {
    (mockPrisma.companyProfile.findMany as jest.Mock).mockResolvedValueOnce([]);
    await getCompareFigures(['rocket-lab', 'rocket-lab', 'spacex']);
    expect(mockPrisma.companyProfile.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.companyProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ['rocket-lab', 'spacex'] } } })
    );
  });

  it('maps rows keyed by slug', async () => {
    (mockPrisma.companyProfile.findMany as jest.Mock).mockResolvedValueOnce([
      {
        slug: 'rocket-lab',
        name: 'Rocket Lab',
        isPublic: true,
        ticker: 'RKLB',
        marketCap: 12_000_000_000,
        stockPrice: 24.5,
        valuation: null,
        totalFunding: null,
        lastVerified: new Date('2026-08-10T00:00:00Z'),
      },
    ]);
    const result = await getCompareFigures(['rocket-lab']);
    expect(result['rocket-lab']).toEqual({
      slug: 'rocket-lab',
      name: 'Rocket Lab',
      isPublic: true,
      ticker: 'RKLB',
      marketCapUSD: 12_000_000_000,
      stockPrice: 24.5,
      valuationUSD: null,
      totalFundingUSD: null,
      lastVerified: new Date('2026-08-10T00:00:00Z'),
    });
  });

  it('omits slugs with no matching row', async () => {
    (mockPrisma.companyProfile.findMany as jest.Mock).mockResolvedValueOnce([]);
    const result = await getCompareFigures(['unknown-co']);
    expect(result['unknown-co']).toBeUndefined();
  });

  it('returns empty map on DB failure instead of throwing', async () => {
    (mockPrisma.companyProfile.findMany as jest.Mock).mockRejectedValueOnce(new Error('connection refused'));
    const result = await getCompareFigures(['rocket-lab']);
    expect(result).toEqual({});
  });
});
