/**
 * @jest-environment node
 *
 * The Space Insider Activity edition, computed over fabricated rows.
 *
 * The arithmetic is the product here, so the thing under test is not "does it
 * render" but "does it count the right rows". One assertion carries most of
 * the weight: a month containing a grant, a tax withholding, an option
 * exercise and a gift alongside one real purchase and one real sale must
 * report ONE purchase and ONE sale — not six trades — and must still publish
 * the other four so the exclusion is visible.
 */

import { buildInsiderActivityEdition, INSIDER_NOTICE } from '../research-report-insider';

const insiderTransaction = { findMany: jest.fn() };
const institutionalPosition = { findMany: jest.fn() };
const issuerFiling = { findMany: jest.fn() };

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    insiderTransaction: { findMany: (...a: unknown[]) => insiderTransaction.findMany(...a) },
    institutionalPosition: { findMany: (...a: unknown[]) => institutionalPosition.findMany(...a) },
    issuerFiling: { findMany: (...a: unknown[]) => issuerFiling.findMany(...a) },
  },
}));

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function tx(over: Record<string, unknown>) {
  return {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    transactionDate: d('2026-08-10'),
    filingDate: d('2026-08-12'),
    formType: '4',
    ownerName: 'Doe Jane',
    ownerTitle: 'Chief Executive Officer',
    isDirector: false,
    isOfficer: true,
    isTenPercentOwner: false,
    isOtherRelationship: false,
    derivative: false,
    securityTitle: 'Common Stock',
    transactionCode: 'P',
    transactionClass: 'open-market-purchase',
    acquiredDisposed: 'A',
    shares: 1000,
    pricePerShare: 10,
    valueUsd: 10_000,
    sharesOwnedAfter: 5000,
    footnoted: false,
    accessionNumber: '0001-26-000001',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1/0001-26-000001-index.htm',
    ...over,
  };
}

const MONTH = [
  // The two real trades.
  tx({ transactionCode: 'P', transactionClass: 'open-market-purchase', shares: 1000, pricePerShare: 10, valueUsd: 10_000 }),
  tx({
    transactionCode: 'S',
    transactionClass: 'open-market-sale',
    ownerName: 'Roe Sam',
    shares: 400,
    pricePerShare: 20,
    valueUsd: 8_000,
    acquiredDisposed: 'D',
    accessionNumber: '0001-26-000002',
  }),
  // Four automatic compensation events that must NOT become trades.
  tx({
    transactionCode: 'A',
    transactionClass: 'award-or-grant',
    shares: 50_000,
    pricePerShare: 0,
    valueUsd: null,
    accessionNumber: '0001-26-000003',
  }),
  tx({
    transactionCode: 'F',
    transactionClass: 'tax-withholding',
    shares: 9_000,
    pricePerShare: 20,
    valueUsd: 180_000,
    acquiredDisposed: 'D',
    accessionNumber: '0001-26-000004',
  }),
  tx({
    transactionCode: 'M',
    transactionClass: 'derivative-exercise',
    shares: 3_000,
    pricePerShare: 1,
    valueUsd: 3_000,
    accessionNumber: '0001-26-000005',
  }),
  tx({
    transactionCode: 'G',
    transactionClass: 'gift',
    shares: 500,
    pricePerShare: null,
    valueUsd: null,
    accessionNumber: '0001-26-000006',
  }),
];

const POSITIONS = [
  {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    formType: 'SCHEDULE 13G/A',
    isAmendment: true,
    isActivistForm: false,
    filingDate: d('2026-08-14'),
    eventDate: d('2026-06-30'),
    holderName: 'Vanguard Capital Management',
    holderType: 'IA',
    securitiesClass: 'Common Stock',
    sharesBeneficiallyOwned: 30_000_000,
    percentOfClass: 6.2,
    soleVoting: 1_000_000,
    sharedVoting: 0,
    soleDispositive: 30_000_000,
    sharedDispositive: 0,
    accessionNumber: '0002-26-000001',
    sourceUrl: 'https://www.sec.gov/x',
  },
  {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    formType: 'SCHEDULE 13D',
    isAmendment: false,
    isActivistForm: true,
    filingDate: d('2026-08-20'),
    eventDate: d('2026-08-12'),
    holderName: 'Someone New LP',
    holderType: 'PN',
    securitiesClass: 'Common Stock',
    sharesBeneficiallyOwned: 9_000_000,
    percentOfClass: 5.4,
    soleVoting: 9_000_000,
    sharedVoting: 0,
    soleDispositive: 9_000_000,
    sharedDispositive: 0,
    accessionNumber: '0002-26-000002',
    sourceUrl: 'https://www.sec.gov/y',
  },
];

/** The same holder's earlier filing, so the change column has a base. */
const PRIOR_POSITIONS = [
  {
    companySlug: 'rocket-lab',
    holderName: 'Vanguard Capital Management',
    filingDate: d('2026-02-10'),
    percentOfClass: 5.19,
    sharesBeneficiallyOwned: 25_000_000,
    formType: 'SCHEDULE 13G',
  },
];

const FILINGS = [
  {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    form: '8-K',
    filingDate: d('2026-08-05'),
    reportDate: d('2026-08-05'),
    items: '7.01,8.01',
    accessionNumber: '0003-26-000001',
    sourceUrl: 'https://www.sec.gov/a',
  },
  {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    form: '8-K',
    filingDate: d('2026-08-06'),
    reportDate: d('2026-08-06'),
    items: '2.02',
    accessionNumber: '0003-26-000002',
    sourceUrl: 'https://www.sec.gov/b',
  },
  {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    form: '10-Q',
    filingDate: d('2026-08-07'),
    reportDate: d('2026-06-30'),
    items: null,
    accessionNumber: '0003-26-000003',
    sourceUrl: 'https://www.sec.gov/c',
  },
  {
    companySlug: 'rocket-lab',
    companyName: 'Rocket Lab',
    ticker: 'RKLB',
    form: 'NT 10-Q',
    filingDate: d('2026-08-08'),
    reportDate: d('2026-06-30'),
    items: null,
    accessionNumber: '0003-26-000004',
    sourceUrl: 'https://www.sec.gov/d',
  },
];

/** Two prior months of 8-Ks: one each, so the trailing mean is 1.0. */
const LOOKBACK_FILINGS = [
  { companySlug: 'rocket-lab', form: '8-K', filingDate: d('2026-06-10') },
  { companySlug: 'rocket-lab', form: '8-K', filingDate: d('2026-07-10') },
  { companySlug: 'rocket-lab', form: '10-Q', filingDate: d('2026-07-11') },
];

function wire(opts: { transactions?: unknown[]; filings?: unknown[] } = {}) {
  const transactions = opts.transactions ?? MONTH;
  const filings = opts.filings ?? FILINGS;
  // Call order in the builder: month transactions, prior-month transactions,
  // positions, prior positions, month filings, lookback filings, covered.
  insiderTransaction.findMany
    .mockResolvedValueOnce(transactions)
    .mockResolvedValueOnce([]);
  institutionalPosition.findMany
    .mockResolvedValueOnce(POSITIONS)
    .mockResolvedValueOnce(PRIOR_POSITIONS);
  issuerFiling.findMany
    .mockResolvedValueOnce(filings)
    .mockResolvedValueOnce(LOOKBACK_FILINGS)
    .mockResolvedValueOnce([{ companySlug: 'rocket-lab' }, { companySlug: 'firefly' }]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the August 2026 edition', () => {
  it('counts ONE purchase and ONE sale out of six transaction lines', async () => {
    wire();
    const edition = await buildInsiderActivityEdition('2026-08');

    const purchases = edition.tables.find((t) => t.id === 'open-market-purchases')!;
    const sales = edition.tables.find((t) => t.id === 'open-market-sales')!;
    expect(purchases.rows).toHaveLength(1);
    expect(sales.rows).toHaveLength(1);

    const headline = Object.fromEntries(edition.headline.map((h) => [h.label, h.value]));
    expect(headline['Open-market insider purchases']).toBe('1');
    expect(headline['Open-market insider sales']).toBe('1');
    // The four automatic events are counted and named, not silently dropped.
    expect(headline['Lines excluded from the two figures above']).toBe('4');
  });

  it('publishes every excluded class so the exclusion can be checked', async () => {
    wire();
    const edition = await buildInsiderActivityEdition('2026-08');
    const classes = edition.tables.find((t) => t.id === 'transaction-classes')!;
    const inHeadline = classes.rows.filter((r) => r.countedInHeadline === 'yes');
    const excluded = classes.rows.filter((r) => r.countedInHeadline === 'no');
    expect(inHeadline).toHaveLength(2);
    expect(excluded.map((r) => r.transactionClass).sort()).toEqual([
      'Derivative exercise or conversion',
      'Gift',
      'Grant or award',
      'Shares withheld for tax or exercise price',
    ]);
    // Every line is accounted for somewhere in the table.
    expect(classes.rows.reduce((s, r) => s + (r.lines as number), 0)).toBe(6);
  });

  it('keeps grants and withholding out of the per-company net', async () => {
    wire();
    const edition = await buildInsiderActivityEdition('2026-08');
    const row = edition.tables.find((t) => t.id === 'by-company')!.rows[0];
    // 1,000 bought minus 400 sold. The 50,000 granted and 9,000 withheld are
    // reported in their own columns and touch neither net figure.
    expect(row.netOpenMarketShares).toBe(600);
    expect(row.netOpenMarketValueUsd).toBe(2_000);
    expect(row.grantShares).toBe(50_000);
    expect(row.sharesWithheldForTax).toBe(9_000);
    expect(row.distinctBuyers).toBe(1);
    expect(row.distinctSellers).toBe(1);
  });

  it('measures a 5% holder against that holder’s own previous filing, and leaves a new one blank', async () => {
    wire();
    const edition = await buildInsiderActivityEdition('2026-08');
    const rows = edition.tables.find((t) => t.id === 'institutional-positions')!.rows;
    const vanguard = rows.find((r) => r.holder === 'Vanguard Capital Management')!;
    const fresh = rows.find((r) => r.holder === 'Someone New LP')!;
    expect(vanguard.priorPercentOfClass).toBe(5.19);
    expect(vanguard.percentPointChange).toBeCloseTo(1.01, 2);
    // No earlier filing by this holder: blank, NOT zero and NOT "new position".
    expect(fresh.percentPointChange).toBeNull();
    expect(fresh.priorFilingDate).toBe('');
  });

  it('compares 8-K volume against the months we actually hold, not a fixed twelve', async () => {
    wire();
    const edition = await buildInsiderActivityEdition('2026-08');
    const row = edition.tables.find((t) => t.id === 'filing-cadence')!.rows[0];
    expect(row.eightKFilings).toBe(2);
    // Two prior months in the lookback, two 8-Ks: a mean of 1.0, not 2/12.
    expect(row.monthsOfPriorHistory).toBe(2);
    expect(row.trailingMonthlyMean8K).toBe(1);
    expect(row.eightKAboveTrailingMean).toBe(1);
    expect(row.lateFilingNotices).toBe(1);
    // 10-Q filed 2026-08-07 for a quarter ending 2026-06-30 = 38 days.
    expect(row.medianDaysAfterPeriodEnd).toBe(38);
    // NT 10-Q and 8-K were both seen before? Only 8-K and 10-Q were, so NT 10-Q
    // is first-seen this month.
    expect(row.formsFirstSeenThisMonth).toBe('NT 10-Q');
  });

  it('carries the not-investment-advice notice on the edition and in coverage', async () => {
    wire();
    const edition = await buildInsiderActivityEdition('2026-08');
    expect(edition.notice).toBe(INSIDER_NOTICE);
    expect(edition.notice).toContain('not a registered investment adviser');
    expect(edition.coverage.join(' ')).toContain('no figure is a recommendation');
  });

  it('reports an empty month as empty rather than as a table of zeroes', async () => {
    insiderTransaction.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    institutionalPosition.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    issuerFiling.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const edition = await buildInsiderActivityEdition('2026-08');
    expect(edition.empty).toBe(true);
    expect(edition.tables).toEqual([]);
    expect(edition.headline).toEqual([]);
    expect(edition.emptyReason).toContain('No SEC filings are recorded');
    // Even an empty edition ships the notice.
    expect(edition.notice).toBe(INSIDER_NOTICE);
  });

  it('refuses a malformed period rather than computing something', async () => {
    await expect(buildInsiderActivityEdition('2026-13')).rejects.toThrow('Invalid month');
  });

  it('produces a stable hash that ignores the computation timestamp', async () => {
    wire();
    const a = await buildInsiderActivityEdition('2026-08');
    wire();
    const b = await buildInsiderActivityEdition('2026-08');
    expect(a.inputHash).toBe(b.inputHash);
    expect(a.asOf).toBe('2026-08-31');
  });
});
