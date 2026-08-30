import {
  extractAnnualRevenue,
  dedupeAnnualByFiscalYear,
  hasExchangeSuffix,
  padCik,
  buildTickerCikMap,
  type SecCompanyFacts,
  type SecFactPoint,
} from '../sec-revenue';

// Small hand-written companyfacts fixture modeled on the real
// data.sec.gov/api/xbrl/companyfacts/CIK##########.json shape, with just
// enough noise (a quarterly 10-Q, a duplicate/restated FY2023 filing, a
// non-USD unit, and an amended-form entry) to exercise the filters.
const FIXTURE: SecCompanyFacts = {
  cik: 1801832,
  entityName: 'Test Rocket Co',
  facts: {
    'us-gaap': {
      Revenues: {
        label: 'Revenues',
        units: {
          USD: [
            // FY2021 10-K
            { start: '2021-01-01', end: '2021-12-31', val: 100_000_000, accn: '0001-21-000001', fy: 2021, fp: 'FY', form: '10-K', filed: '2022-02-15' },
            // FY2022 10-K
            { start: '2022-01-01', end: '2022-12-31', val: 150_000_000, accn: '0001-22-000001', fy: 2022, fp: 'FY', form: '10-K', filed: '2023-02-14' },
            // FY2023 10-K, original filing
            { start: '2023-01-01', end: '2023-12-31', val: 200_000_000, accn: '0001-23-000001', fy: 2023, fp: 'FY', form: '10-K', filed: '2024-02-13' },
            // FY2023 10-K, restated later filing — this one should win (latest filed)
            { start: '2023-01-01', end: '2023-12-31', val: 205_000_000, accn: '0001-23-000002', fy: 2023, fp: 'FY', form: '10-K', filed: '2024-04-01' },
            // FY2024 10-K — most recent year
            { start: '2024-01-01', end: '2024-12-31', val: 260_000_000, accn: '0001-24-000001', fy: 2024, fp: 'FY', form: '10-K', filed: '2025-02-11' },
            // Noise: a quarterly 10-Q figure for fy 2024 Q1 — must be excluded (form !== 10-K)
            { start: '2024-01-01', end: '2024-03-31', val: 60_000_000, accn: '0001-24-000000', fy: 2024, fp: 'Q1', form: '10-Q', filed: '2024-05-10' },
            // Noise: fp is a quarter label even though form says 10-K — must be excluded (fp !== FY)
            { start: '2020-10-01', end: '2020-12-31', val: 40_000_000, accn: '0001-21-000000', fy: 2021, fp: 'Q4', form: '10-K', filed: '2021-03-01' },
          ],
          // Noise: a non-USD unit present on the same tag — must never be read.
          USDshares: [
            { end: '2024-12-31', val: 999, accn: '0001-24-000001', fy: 2024, fp: 'FY', form: '10-K', filed: '2025-02-11' },
          ],
        },
      },
    },
  },
};

describe('dedupeAnnualByFiscalYear', () => {
  it('keeps one point per fiscal year and the latest-filed on a restatement', () => {
    const points = FIXTURE.facts!['us-gaap']!.Revenues.units!.USD;
    const result = dedupeAnnualByFiscalYear(points, 'Revenues', 3);
    expect(result).toHaveLength(3);
    // Most recent first
    expect(result.map((r) => r.fiscalYear)).toEqual([2024, 2023, 2022]);
    // FY2023 restatement (later filed date) wins over the original filing
    const fy2023 = result.find((r) => r.fiscalYear === 2023)!;
    expect(fy2023.revenue).toBe(205_000_000);
    expect(fy2023.accn).toBe('0001-23-000002');
  });

  it('excludes non-10-K forms and non-FY periods', () => {
    const points: SecFactPoint[] = [
      { end: '2024-03-31', val: 1, accn: 'a', fy: 2024, fp: 'Q1', form: '10-Q', filed: '2024-05-01' },
      { end: '2024-12-31', val: 2, accn: 'b', fy: 2024, fp: 'Q4', form: '10-K', filed: '2025-02-01' },
    ];
    expect(dedupeAnnualByFiscalYear(points, 'Revenues')).toEqual([]);
  });

  it('respects the count cap', () => {
    const points = FIXTURE.facts!['us-gaap']!.Revenues.units!.USD;
    const result = dedupeAnnualByFiscalYear(points, 'Revenues', 1);
    expect(result).toHaveLength(1);
    expect(result[0].fiscalYear).toBe(2024);
  });
});

describe('extractAnnualRevenue', () => {
  it('reads Revenues when present and returns three most recent years, most recent first', () => {
    const result = extractAnnualRevenue(FIXTURE);
    expect(result.map((r) => r.fiscalYear)).toEqual([2024, 2023, 2022]);
    expect(result[0].revenue).toBe(260_000_000);
    expect(result.every((r) => r.tag === 'Revenues')).toBe(true);
  });

  it('falls back to RevenueFromContractWithCustomerExcludingAssessedTax when Revenues is absent', () => {
    const fixture: SecCompanyFacts = {
      facts: {
        'us-gaap': {
          RevenueFromContractWithCustomerExcludingAssessedTax: {
            units: {
              USD: [
                { end: '2024-12-31', val: 50_000_000, accn: 'x', fy: 2024, fp: 'FY', form: '10-K', filed: '2025-02-01' },
              ],
            },
          },
        },
      },
    };
    const result = extractAnnualRevenue(fixture);
    expect(result).toHaveLength(1);
    expect(result[0].tag).toBe('RevenueFromContractWithCustomerExcludingAssessedTax');
    expect(result[0].revenue).toBe(50_000_000);
  });

  it('falls back to SalesRevenueNet when the first two tags are absent', () => {
    const fixture: SecCompanyFacts = {
      facts: {
        'us-gaap': {
          SalesRevenueNet: {
            units: {
              USD: [
                { end: '2024-12-31', val: 30_000_000, accn: 'y', fy: 2024, fp: 'FY', form: '10-K', filed: '2025-02-01' },
              ],
            },
          },
        },
      },
    };
    const result = extractAnnualRevenue(fixture);
    expect(result).toHaveLength(1);
    expect(result[0].tag).toBe('SalesRevenueNet');
  });

  it('returns [] when no us-gaap facts exist at all', () => {
    expect(extractAnnualRevenue({})).toEqual([]);
    expect(extractAnnualRevenue(null)).toEqual([]);
    expect(extractAnnualRevenue(undefined)).toEqual([]);
  });

  it('returns [] when tags exist but have no annual 10-K/FY USD data', () => {
    const fixture: SecCompanyFacts = {
      facts: {
        'us-gaap': {
          Revenues: {
            units: {
              USD: [{ end: '2024-03-31', val: 1, accn: 'z', fy: 2024, fp: 'Q1', form: '10-Q', filed: '2024-05-01' }],
            },
          },
        },
      },
    };
    expect(extractAnnualRevenue(fixture)).toEqual([]);
  });
});

describe('hasExchangeSuffix', () => {
  it('flags tickers with a dot suffix', () => {
    expect(hasExchangeSuffix('BRK.B')).toBe(true);
    expect(hasExchangeSuffix('RKLB')).toBe(false);
  });
});

describe('padCik', () => {
  it('zero-pads to 10 digits', () => {
    expect(padCik(320193)).toBe('0000320193');
    expect(padCik('1801832')).toBe('0001801832');
    expect(padCik(1234567890)).toBe('1234567890');
  });
});

describe('buildTickerCikMap', () => {
  const rows = {
    '0': { cik_str: 1801832, ticker: 'rklb', title: 'Rocket Lab USA, Inc.' },
    '1': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  };

  it('uppercases tickers and zero-pads CIKs, from both object and array shapes', () => {
    const fromObject = buildTickerCikMap(rows);
    expect(fromObject.get('RKLB')).toBe('0001801832');
    expect(fromObject.get('AAPL')).toBe('0000320193');

    const fromArray = buildTickerCikMap(Object.values(rows));
    expect(fromArray.get('RKLB')).toBe('0001801832');
  });
});
