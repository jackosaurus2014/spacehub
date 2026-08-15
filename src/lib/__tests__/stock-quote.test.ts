/**
 * Tests for src/lib/stock-quote.ts -- the shared Yahoo Finance quote ->
 * CompanyProfile field mapping used by both the daily stock-sync cron
 * (src/app/api/cron/stock-sync/route.ts) and the render-time live lookup on
 * /company-profiles/[slug] (src/app/api/company-profiles/[slug]/route.ts).
 */
import { mapQuoteToProfileFields } from '@/lib/stock-quote';

describe('mapQuoteToProfileFields', () => {
  it('maps a normal equity quote to stock fields', () => {
    const result = mapQuoteToProfileFields({
      regularMarketPrice: 80.25,
      marketCap: 4_460_000_000,
      regularMarketChangePercent: 1.23,
    });

    expect(result).toEqual({
      stockPrice: 80.25,
      marketCap: 4_460_000_000,
      priceChange24h: 1.23,
    });
  });

  it('returns null for a null/undefined quote', () => {
    expect(mapQuoteToProfileFields(null)).toBeNull();
    expect(mapQuoteToProfileFields(undefined)).toBeNull();
  });

  it('returns null when regularMarketPrice is missing', () => {
    expect(mapQuoteToProfileFields({ marketCap: 1000 })).toBeNull();
  });

  it('returns null when regularMarketPrice is zero or negative', () => {
    expect(mapQuoteToProfileFields({ regularMarketPrice: 0 })).toBeNull();
    expect(mapQuoteToProfileFields({ regularMarketPrice: -5 })).toBeNull();
  });

  it('returns null when regularMarketPrice is non-numeric', () => {
    // @ts-expect-error -- deliberately malformed input to mimic a bad API response
    expect(mapQuoteToProfileFields({ regularMarketPrice: 'n/a' })).toBeNull();
  });

  it('treats a missing/invalid marketCap as null but still returns the price', () => {
    const result = mapQuoteToProfileFields({ regularMarketPrice: 25.5 });
    expect(result).toEqual({ stockPrice: 25.5, marketCap: null, priceChange24h: null });
  });

  it('treats a zero or negative marketCap as null (foreign/unquotable-style data)', () => {
    const result = mapQuoteToProfileFields({ regularMarketPrice: 10, marketCap: 0 });
    expect(result?.marketCap).toBeNull();
  });

  it('skips (returns null) for non-USD quotes rather than treating local-currency figures as USD', () => {
    // Regression test: a KRW-denominated marketCap written in as if it were
    // USD would be off by ~1000x (e.g. Hanwha Systems' KRW market cap was
    // briefly written into a USD field as $15 trillion during backfill).
    const result = mapQuoteToProfileFields({
      regularMarketPrice: 80300,
      marketCap: 15_015_559_036_928,
      regularMarketChangePercent: 0.5,
      currency: 'KRW',
    });
    expect(result).toBeNull();
  });

  it('accepts a USD quote and quotes missing a currency field (legacy/minimal shapes)', () => {
    expect(mapQuoteToProfileFields({ regularMarketPrice: 10, currency: 'USD' })).not.toBeNull();
    expect(mapQuoteToProfileFields({ regularMarketPrice: 10 })).not.toBeNull();
  });

  it('treats a non-finite marketCap or changePercent as null', () => {
    const result = mapQuoteToProfileFields({
      regularMarketPrice: 10,
      marketCap: Infinity,
      regularMarketChangePercent: NaN,
    });
    expect(result?.marketCap).toBeNull();
    expect(result?.priceChange24h).toBeNull();
  });
});
