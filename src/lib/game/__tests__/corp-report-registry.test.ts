/**
 * @jest-environment node
 */
import {
  sanitizePlainText,
  quarterKey,
  shapeCorpReportForStorage,
  parseStoredCorpReport,
  formatQuarterLabel,
  type PublishableQuarterlyReport,
} from '../corp-report-registry';

function baseReport(overrides: Partial<PublishableQuarterlyReport> = {}): PublishableQuarterlyReport {
  return {
    quarterIndex: 3,
    quarterNumber: 4,
    gameYear: 2027,
    quarterOfYear: 4,
    gameDate: { year: 2027, month: 12 },
    revenue: 1_500_000,
    costs: 900_000,
    profit: 600_000,
    netWorth: 12_000_000,
    fleetCount: 5,
    buildingCount: 8,
    corporationTier: 3,
    notableEvents: ['Launched a new mining rig'],
    growthRatePct: 12.4,
    ...overrides,
  };
}

describe('sanitizePlainText', () => {
  it('strips HTML tags entirely', () => {
    expect(sanitizePlainText('<script>alert(1)</script>Hello', 100)).toBe('Hello');
    expect(sanitizePlainText('<b>Bold</b> text', 100)).toBe('Bold text');
  });

  it('trims whitespace and clamps length', () => {
    expect(sanitizePlainText('  padded  ', 100)).toBe('padded');
    expect(sanitizePlainText('a'.repeat(50), 10)).toHaveLength(10);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizePlainText(null, 10)).toBe('');
    expect(sanitizePlainText(undefined, 10)).toBe('');
    expect(sanitizePlainText(42, 10)).toBe('');
  });

  it('neutralizes an img/onerror XSS payload', () => {
    const payload = '<img src=x onerror="alert(1)">Gotcha';
    expect(sanitizePlainText(payload, 200)).toBe('Gotcha');
  });
});

describe('quarterKey', () => {
  it('formats a stable, monotonic key from quarterIndex', () => {
    expect(quarterKey(0)).toBe('Q0');
    expect(quarterKey(17)).toBe('Q17');
  });

  it('clamps negative/non-finite input to Q0', () => {
    expect(quarterKey(-5)).toBe('Q0');
    expect(quarterKey(NaN)).toBe('Q0');
  });
});

describe('shapeCorpReportForStorage', () => {
  it('preserves valid numeric and string fields', () => {
    const shaped = shapeCorpReportForStorage(baseReport(), 1000);
    expect(shaped.quarterIndex).toBe(3);
    expect(shaped.revenue).toBe(1_500_000);
    expect(shaped.netWorth).toBe(12_000_000);
    expect(shaped.notableEvents).toEqual(['Launched a new mining rig']);
    expect(shaped.growthRatePct).toBeCloseTo(12.4);
    expect(shaped.publishedAt).toBe(1000);
  });

  it('sanitizes HTML out of notableEvents', () => {
    const shaped = shapeCorpReportForStorage(
      baseReport({ notableEvents: ['<script>evil()</script>Milestone hit', '<b>Bold</b> acquisition'] }),
    );
    expect(shaped.notableEvents).toEqual(['Milestone hit', 'Bold acquisition']);
  });

  it('drops notableEvents past the first 5 and past 200 chars each', () => {
    const many = Array.from({ length: 10 }, (_, i) => `Event number ${i}`);
    const shaped = shapeCorpReportForStorage(baseReport({ notableEvents: many }));
    expect(shaped.notableEvents).toHaveLength(5);

    const long = shapeCorpReportForStorage(baseReport({ notableEvents: ['x'.repeat(500)] }));
    expect(long.notableEvents[0]).toHaveLength(200);
  });

  it('filters out empty notableEvents entries after sanitization', () => {
    const shaped = shapeCorpReportForStorage(baseReport({ notableEvents: ['<script></script>', 'Real event'] }));
    expect(shaped.notableEvents).toEqual(['Real event']);
  });

  it('clamps non-finite numeric fields to safe defaults instead of throwing', () => {
    const shaped = shapeCorpReportForStorage(
      baseReport({
        revenue: NaN,
        fleetCount: -3,
        buildingCount: Infinity,
        corporationTier: 999,
        quarterOfYear: 9,
      }),
    );
    expect(shaped.revenue).toBe(0);
    expect(shaped.fleetCount).toBe(0);
    expect(shaped.buildingCount).toBe(0); // Infinity is non-finite -> falls back to 0
    expect(shaped.corporationTier).toBe(20); // clamped to max
    expect(shaped.quarterOfYear).toBe(4); // clamped to max
  });

  it('preserves a null growthRatePct (first report on file)', () => {
    const shaped = shapeCorpReportForStorage(baseReport({ growthRatePct: null }));
    expect(shaped.growthRatePct).toBeNull();
  });

  it('coerces a non-finite growthRatePct to null rather than fabricating a number', () => {
    const shaped = shapeCorpReportForStorage(baseReport({ growthRatePct: NaN }));
    expect(shaped.growthRatePct).toBeNull();
  });

  it('drops an invalid gameDate rather than storing garbage', () => {
    const shaped = shapeCorpReportForStorage(baseReport({ gameDate: { year: NaN, month: 1 } }));
    expect(shaped.gameDate).toBeNull();
  });

  it('leaves optional P&L fields undefined when not provided', () => {
    const shaped = shapeCorpReportForStorage(baseReport());
    expect(shaped.governorTaxQuarterly).toBeUndefined();
    expect(shaped.outstandingRepairCost).toBeUndefined();
  });

  it('clamps provided optional P&L fields', () => {
    const shaped = shapeCorpReportForStorage(baseReport({ governorTaxQuarterly: NaN, outstandingRepairCost: 500 }));
    expect(shaped.governorTaxQuarterly).toBe(0);
    expect(shaped.outstandingRepairCost).toBe(500);
  });
});

describe('parseStoredCorpReport', () => {
  it('round-trips a shaped report through JSON', () => {
    const shaped = shapeCorpReportForStorage(baseReport(), 2000);
    const parsed = parseStoredCorpReport(JSON.stringify(shaped));
    expect(parsed).not.toBeNull();
    expect(parsed?.netWorth).toBe(12_000_000);
    expect(parsed?.quarterNumber).toBe(4);
  });

  it('returns null for invalid JSON', () => {
    expect(parseStoredCorpReport('not json{{{')).toBeNull();
  });

  it('returns null for JSON missing required numeric fields', () => {
    expect(parseStoredCorpReport(JSON.stringify({ foo: 'bar' }))).toBeNull();
    expect(parseStoredCorpReport(JSON.stringify({ netWorth: 100 }))).toBeNull();
  });

  it('returns null for a non-object JSON value', () => {
    expect(parseStoredCorpReport(JSON.stringify('just a string'))).toBeNull();
    expect(parseStoredCorpReport(JSON.stringify(42))).toBeNull();
  });

  it('re-sanitizes on read as defense in depth', () => {
    // Simulates a row that somehow has an unsanitized string in it (e.g. a
    // future writer bug) — parseStoredCorpReport must not trust it blindly.
    const raw = JSON.stringify({
      ...shapeCorpReportForStorage(baseReport()),
      notableEvents: ['<img src=x onerror=alert(1)>Sneaky'],
    });
    const parsed = parseStoredCorpReport(raw);
    expect(parsed?.notableEvents).toEqual(['Sneaky']);
  });
});

describe('formatQuarterLabel', () => {
  it('formats a human-readable quarter label', () => {
    expect(formatQuarterLabel({ quarterOfYear: 3, gameYear: 2028 })).toBe('Q3 2028');
  });
});
