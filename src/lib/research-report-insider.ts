/**
 * SpaceNexus Space Insider Activity — monthly.
 *
 * WHAT THIS IS
 * ------------
 * Three SEC-derived datasets over the listed space names, aggregated for one
 * month: the transactions company insiders reported on Form 4, the 5%-holder
 * positions reported on Schedule 13D and 13G, and the filing cadence of the
 * issuers themselves. All three are free, official and public; none of them is
 * aggregated anywhere for this sector.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not investment advice, and the shape of the file reflects that rather
 * than merely asserting it. There is no "signal", no score, no direction, no
 * sentiment and no target anywhere below. Every figure is a count, a sum or a
 * difference over rows that each carry an accession number and a URL, and
 * every table names what it cannot see. A reader who wants a view forms it
 * themselves; what we sell is the disclosure, assembled.
 *
 * THE ONE DISTINCTION THAT MATTERS
 * --------------------------------
 * A restricted-stock grant (code A) is not a purchase, and shares withheld to
 * pay the tax on it (code F) are not a sale. Adding them into "bought" and
 * "sold" is how most insider datasets are built and it is wrong: those are
 * automatic events on a compensation calendar, not decisions. The headline
 * figures here count ONLY codes P and S — an open-market purchase and an
 * open-market sale — and a separate table publishes every other class beside
 * them so the reader can see exactly what was excluded and why.
 * src/lib/market-signals/form4-codes.ts holds that table; nothing here
 * classifies a code on its own.
 *
 * Nothing in this file calls a model. Every number is arithmetic over our own
 * rows. The release-registry test greps this path for AI imports.
 */

import prisma from '@/lib/db';
import {
  FORM4_CLASS_LABEL,
  FORM4_CLASS_ORDER,
  form4CodeLabel,
  isDiscretionaryMarketTrade,
  ownerRoles,
  type Form4Class,
} from '@/lib/market-signals/form4-codes';
import {
  fmtCount,
  fmtUsd,
  hashEditionContent,
  type ReportFigure,
  type ReportTable,
  type ResearchReportEdition,
} from '@/lib/research-report-types';
import {
  getRelease,
  periodEndDate,
  periodLabel,
  periodRange,
  previousPeriod,
} from '@/lib/research-releases';
import {
  INSIDER_DEFAULT_SINCE,
  SCHEDULE_13_STRUCTURED_SINCE,
} from '@/lib/fetchers/sec-insider-fetcher';

const RELEASE_ID = 'space-insider-activity';

/**
 * The notice that renders above the first figure and ships inside every
 * export. The house rule (see the spacex-stock guide) is that a surface
 * touching investing carries this in the reader's first screenful.
 */
export const INSIDER_NOTICE =
  'SpaceNexus is not a registered investment adviser, broker or dealer. This release reports what was filed with the SEC and nothing more: it contains no recommendation to buy, sell or hold any security, no rating, no price target and no forecast, and it does not consider any reader’s circumstances. Insider and institutional filings are disclosures of past transactions and positions, they are frequently amended, and they are not a prediction of anything. Verify every figure against the linked filing before acting on it, and consult a licensed financial professional.';

/** Months of history used for the 8-K cadence comparison. */
const CADENCE_LOOKBACK_MONTHS = 12;

/** Forms whose filing lag against the period they cover is worth reporting. */
const PERIODIC_FORMS = new Set(['10-K', '10-Q', '20-F', '40-F']);

/** SEC notifications of late periodic filing. Their presence is a fact. */
const LATE_FILING_FORMS = new Set(['NT 10-K', 'NT 10-Q', 'NT 20-F', 'NT 10-K/A', 'NT 10-Q/A']);

const DAY_MS = 86_400_000;

interface TxRow {
  companySlug: string;
  companyName: string;
  ticker: string | null;
  transactionDate: Date;
  filingDate: Date;
  formType: string;
  ownerName: string;
  ownerTitle: string | null;
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  isOtherRelationship: boolean;
  derivative: boolean;
  securityTitle: string | null;
  transactionCode: string | null;
  transactionClass: string;
  acquiredDisposed: string | null;
  shares: number | null;
  pricePerShare: number | null;
  valueUsd: number | null;
  sharesOwnedAfter: number | null;
  footnoted: boolean;
  accessionNumber: string;
  sourceUrl: string;
}

const TX_SELECT = {
  companySlug: true,
  companyName: true,
  ticker: true,
  transactionDate: true,
  filingDate: true,
  formType: true,
  ownerName: true,
  ownerTitle: true,
  isDirector: true,
  isOfficer: true,
  isTenPercentOwner: true,
  isOtherRelationship: true,
  derivative: true,
  securityTitle: true,
  transactionCode: true,
  transactionClass: true,
  acquiredDisposed: true,
  shares: true,
  pricePerShare: true,
  valueUsd: true,
  sharesOwnedAfter: true,
  footnoted: true,
  accessionNumber: true,
  sourceUrl: true,
} as const;

function roleOf(r: TxRow): string {
  const roles = ownerRoles({
    isDirector: r.isDirector,
    isOfficer: r.isOfficer,
    isTenPercentOwner: r.isTenPercentOwner,
    isOther: r.isOtherRelationship,
  });
  if (roles.length === 0) return r.ownerTitle ?? '';
  return r.ownerTitle ? `${roles.join(', ')} (${r.ownerTitle})` : roles.join(', ');
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sum(values: (number | null | undefined)[]): number {
  let total = 0;
  for (const v of values) if (typeof v === 'number' && Number.isFinite(v)) total += v;
  return total;
}

/**
 * Build one monthly edition.
 *
 * Returns an edition marked `empty` — never a table of zeroes — when the month
 * holds no SEC rows at all. "We recorded nothing" is a statement about our
 * records and must read that way.
 */
export async function buildInsiderActivityEdition(period: string): Promise<ResearchReportEdition> {
  const release = getRelease(RELEASE_ID)!;
  const range = periodRange('monthly', period);
  if (!range) throw new Error(`Invalid month: ${period}`);

  const priorKey = previousPeriod('monthly', period);
  const priorRange = priorKey ? periodRange('monthly', priorKey) : null;
  const lookbackStart = new Date(
    Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() - CADENCE_LOOKBACK_MONTHS, 1)
  );

  const [transactions, priorTransactions, positions, priorPositions, monthFilings, lookbackFilings, coveredCompanies] =
    await Promise.all([
      prisma.insiderTransaction.findMany({
        where: { transactionDate: { gte: range.start, lt: range.end } },
        orderBy: [{ transactionDate: 'asc' }, { accessionNumber: 'asc' }, { lineKey: 'asc' }],
        select: TX_SELECT,
      }) as Promise<TxRow[]>,
      priorRange
        ? (prisma.insiderTransaction.findMany({
            where: { transactionDate: { gte: priorRange.start, lt: priorRange.end } },
            select: { transactionCode: true, valueUsd: true, ownerName: true },
          }) as Promise<{ transactionCode: string | null; valueUsd: number | null; ownerName: string }[]>)
        : Promise.resolve([] as { transactionCode: string | null; valueUsd: number | null; ownerName: string }[]),
      prisma.institutionalPosition.findMany({
        where: { filingDate: { gte: range.start, lt: range.end } },
        orderBy: [{ filingDate: 'asc' }, { accessionNumber: 'asc' }, { holderKey: 'asc' }],
        select: {
          companySlug: true,
          companyName: true,
          ticker: true,
          formType: true,
          isAmendment: true,
          isActivistForm: true,
          filingDate: true,
          eventDate: true,
          holderName: true,
          holderType: true,
          securitiesClass: true,
          sharesBeneficiallyOwned: true,
          percentOfClass: true,
          soleVoting: true,
          sharedVoting: true,
          soleDispositive: true,
          sharedDispositive: true,
          accessionNumber: true,
          sourceUrl: true,
        },
      }),
      // Every earlier filing by the same holder on the same issuer, so a
      // position change is measured against what that holder last reported
      // rather than against nothing.
      prisma.institutionalPosition.findMany({
        where: { filingDate: { lt: range.start } },
        orderBy: { filingDate: 'asc' },
        select: {
          companySlug: true,
          holderName: true,
          filingDate: true,
          percentOfClass: true,
          sharesBeneficiallyOwned: true,
          formType: true,
        },
      }),
      prisma.issuerFiling.findMany({
        where: { filingDate: { gte: range.start, lt: range.end } },
        orderBy: [{ filingDate: 'asc' }, { accessionNumber: 'asc' }],
        select: {
          companySlug: true,
          companyName: true,
          ticker: true,
          form: true,
          filingDate: true,
          reportDate: true,
          items: true,
          accessionNumber: true,
          sourceUrl: true,
        },
      }),
      prisma.issuerFiling.findMany({
        where: { filingDate: { gte: lookbackStart, lt: range.start } },
        select: { companySlug: true, form: true, filingDate: true },
      }),
      prisma.issuerFiling.findMany({
        distinct: ['companySlug'],
        select: { companySlug: true },
      }),
    ]);

  const computedAt = new Date().toISOString();
  const asOf = periodEndDate('monthly', period)!;
  const title = `${release.title}, ${periodLabel('monthly', period)}`;

  if (transactions.length === 0 && positions.length === 0 && monthFilings.length === 0) {
    return {
      releaseId: RELEASE_ID,
      period,
      periodLabel: periodLabel('monthly', period),
      title,
      asOf,
      computedAt,
      headline: [],
      tables: [],
      notice: INSIDER_NOTICE,
      coverage: [
        'No SEC insider transactions, 5%-holder filings or indexed filings are recorded for this month. That is a statement about our records, not a claim that nothing was filed.',
        `Our parsed SEC history begins ${INSIDER_DEFAULT_SINCE}. Months before that are a backfill boundary, not an assertion about the market.`,
      ],
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: 'No SEC filings are recorded for this month.',
    };
  }

  // --- The one classification that matters ---------------------------------
  const purchases = transactions.filter((t) => t.transactionCode === 'P');
  const sales = transactions.filter((t) => t.transactionCode === 'S');
  const openMarket = transactions.filter((t) => isDiscretionaryMarketTrade(t.transactionCode));
  const nonDiscretionary = transactions.length - openMarket.length;

  const purchaseValue = sum(purchases.map((t) => t.valueUsd));
  const saleValue = sum(sales.map((t) => t.valueUsd));
  const purchaseValueDisclosed = purchases.filter((t) => t.valueUsd !== null).length;
  const saleValueDisclosed = sales.filter((t) => t.valueUsd !== null).length;

  const buyers = new Set(purchases.map((t) => t.ownerName.toLowerCase()));
  const sellers = new Set(sales.map((t) => t.ownerName.toLowerCase()));

  const priorPurchases = priorTransactions.filter((t) => t.transactionCode === 'P');
  const priorSales = priorTransactions.filter((t) => t.transactionCode === 'S');

  // --- Per-company aggregation --------------------------------------------
  interface CompanyBucket {
    slug: string;
    name: string;
    ticker: string | null;
    purchaseLines: number;
    saleLines: number;
    purchaseShares: number;
    saleShares: number;
    purchaseValue: number;
    saleValue: number;
    buyers: Set<string>;
    sellers: Set<string>;
    grantShares: number;
    withheldShares: number;
    otherLines: number;
  }
  const byCompany = new Map<string, CompanyBucket>();
  const bucket = (r: TxRow): CompanyBucket => {
    let b = byCompany.get(r.companySlug);
    if (!b) {
      b = {
        slug: r.companySlug,
        name: r.companyName,
        ticker: r.ticker,
        purchaseLines: 0,
        saleLines: 0,
        purchaseShares: 0,
        saleShares: 0,
        purchaseValue: 0,
        saleValue: 0,
        buyers: new Set(),
        sellers: new Set(),
        grantShares: 0,
        withheldShares: 0,
        otherLines: 0,
      };
      byCompany.set(r.companySlug, b);
    }
    return b;
  };

  for (const r of transactions) {
    const b = bucket(r);
    const shares = typeof r.shares === 'number' ? r.shares : 0;
    if (r.transactionCode === 'P') {
      b.purchaseLines += 1;
      b.purchaseShares += shares;
      b.purchaseValue += r.valueUsd ?? 0;
      b.buyers.add(r.ownerName.toLowerCase());
    } else if (r.transactionCode === 'S') {
      b.saleLines += 1;
      b.saleShares += shares;
      b.saleValue += r.valueUsd ?? 0;
      b.sellers.add(r.ownerName.toLowerCase());
    } else if (r.transactionClass === 'award-or-grant') {
      b.grantShares += shares;
      b.otherLines += 1;
    } else if (r.transactionClass === 'tax-withholding') {
      b.withheldShares += shares;
      b.otherLines += 1;
    } else {
      b.otherLines += 1;
    }
  }

  const companyRows = Array.from(byCompany.values())
    .map((b) => ({
      company: b.name,
      companySlug: b.slug,
      ticker: b.ticker ?? '',
      purchaseLines: b.purchaseLines,
      saleLines: b.saleLines,
      distinctBuyers: b.buyers.size,
      distinctSellers: b.sellers.size,
      purchaseShares: b.purchaseShares,
      saleShares: b.saleShares,
      netOpenMarketShares: b.purchaseShares - b.saleShares,
      purchaseValueUsd: b.purchaseValue || null,
      saleValueUsd: b.saleValue || null,
      netOpenMarketValueUsd: b.purchaseValue - b.saleValue,
      grantShares: b.grantShares,
      sharesWithheldForTax: b.withheldShares,
      otherLines: b.otherLines,
    }))
    .sort(
      (a, b) =>
        b.purchaseLines + b.saleLines - (a.purchaseLines + a.saleLines) ||
        Math.abs(b.netOpenMarketValueUsd) - Math.abs(a.netOpenMarketValueUsd) ||
        a.company.localeCompare(b.company)
    );

  // --- Transaction-class denominator table ---------------------------------
  interface ClassBucket {
    lines: number;
    shares: number;
    value: number;
    valueDisclosed: number;
    codes: Set<string>;
  }
  const byClass = new Map<Form4Class, ClassBucket>();
  for (const r of transactions) {
    const cls = (r.transactionClass as Form4Class) ?? 'other';
    let b = byClass.get(cls);
    if (!b) {
      b = { lines: 0, shares: 0, value: 0, valueDisclosed: 0, codes: new Set() };
      byClass.set(cls, b);
    }
    b.lines += 1;
    b.shares += typeof r.shares === 'number' ? r.shares : 0;
    if (r.valueUsd !== null) {
      b.value += r.valueUsd;
      b.valueDisclosed += 1;
    }
    if (r.transactionCode) b.codes.add(r.transactionCode);
  }
  const classRows = FORM4_CLASS_ORDER.filter((cls) => byClass.has(cls)).map((cls) => {
    const b = byClass.get(cls)!;
    return {
      transactionClass: FORM4_CLASS_LABEL[cls],
      codes: Array.from(b.codes).sort().join(', '),
      lines: b.lines,
      shares: b.shares,
      linesWithDisclosedValue: b.valueDisclosed,
      disclosedValueUsd: b.value || null,
      countedInHeadline: cls === 'open-market-purchase' || cls === 'open-market-sale' ? 'yes' : 'no',
    };
  });

  // --- Institutional positions --------------------------------------------
  const priorByHolder = new Map<string, { percentOfClass: number | null; shares: number | null; filingDate: Date }>();
  for (const p of priorPositions) {
    // Ordered ascending, so the last write wins and is the most recent prior.
    priorByHolder.set(`${p.companySlug}::${p.holderName.toLowerCase()}`, {
      percentOfClass: p.percentOfClass,
      shares: p.sharesBeneficiallyOwned,
      filingDate: p.filingDate,
    });
  }

  const positionRows = positions
    .map((p) => {
      const prior = priorByHolder.get(`${p.companySlug}::${p.holderName.toLowerCase()}`) ?? null;
      const pctChangePoints =
        prior && prior.percentOfClass !== null && p.percentOfClass !== null
          ? Math.round((p.percentOfClass - prior.percentOfClass) * 100) / 100
          : null;
      return {
        filingDate: iso(p.filingDate),
        company: p.companyName,
        companySlug: p.companySlug,
        ticker: p.ticker ?? '',
        holder: p.holderName,
        holderType: p.holderType ?? '',
        form: p.formType,
        amendment: p.isAmendment ? 'yes' : 'no',
        securitiesClass: p.securitiesClass ?? '',
        sharesBeneficiallyOwned: p.sharesBeneficiallyOwned,
        percentOfClass: p.percentOfClass,
        priorPercentOfClass: prior?.percentOfClass ?? null,
        percentPointChange: pctChangePoints,
        priorFilingDate: prior ? iso(prior.filingDate) : '',
        soleVoting: p.soleVoting,
        sharedVoting: p.sharedVoting,
        soleDispositive: p.soleDispositive,
        sharedDispositive: p.sharedDispositive,
        eventDate: p.eventDate ? iso(p.eventDate) : '',
        accessionNumber: p.accessionNumber,
        filing: p.sourceUrl,
      };
    })
    .sort(
      (a, b) =>
        (b.percentOfClass ?? -1) - (a.percentOfClass ?? -1) ||
        a.company.localeCompare(b.company) ||
        a.holder.localeCompare(b.holder)
    );

  const firstTimeHolders = positionRows.filter((r) => r.priorFilingDate === '').length;
  const activistForm = positions.filter((p) => p.isActivistForm).length;

  // --- Filing cadence -------------------------------------------------------
  interface CadenceBucket {
    slug: string;
    name: string;
    ticker: string | null;
    filings: number;
    eightK: number;
    forms: Set<string>;
    lateNotices: number;
    periodicLags: number[];
  }
  const cadence = new Map<string, CadenceBucket>();
  for (const f of monthFilings) {
    let b = cadence.get(f.companySlug);
    if (!b) {
      b = {
        slug: f.companySlug,
        name: f.companyName,
        ticker: f.ticker,
        filings: 0,
        eightK: 0,
        forms: new Set(),
        lateNotices: 0,
        periodicLags: [],
      };
      cadence.set(f.companySlug, b);
    }
    b.filings += 1;
    b.forms.add(f.form);
    if (f.form === '8-K') b.eightK += 1;
    if (LATE_FILING_FORMS.has(f.form)) b.lateNotices += 1;
    if (PERIODIC_FORMS.has(f.form) && f.reportDate) {
      b.periodicLags.push(Math.round((f.filingDate.getTime() - f.reportDate.getTime()) / DAY_MS));
    }
  }

  // Trailing-12-month 8-K counts, and the set of form types each company has
  // filed before this month, so "first in our records" is a real observation.
  const lookback8k = new Map<string, number>();
  const lookbackMonths = new Map<string, Set<string>>();
  const seenForms = new Map<string, Set<string>>();
  for (const f of lookbackFilings) {
    if (f.form === '8-K') lookback8k.set(f.companySlug, (lookback8k.get(f.companySlug) ?? 0) + 1);
    const monthKey = `${f.filingDate.getUTCFullYear()}-${f.filingDate.getUTCMonth()}`;
    if (!lookbackMonths.has(f.companySlug)) lookbackMonths.set(f.companySlug, new Set());
    lookbackMonths.get(f.companySlug)!.add(monthKey);
    if (!seenForms.has(f.companySlug)) seenForms.set(f.companySlug, new Set());
    seenForms.get(f.companySlug)!.add(f.form);
  }

  const cadenceRows = Array.from(cadence.values())
    .map((b) => {
      const priorMonths = lookbackMonths.get(b.slug)?.size ?? 0;
      const prior8k = lookback8k.get(b.slug) ?? 0;
      // A mean over the months we actually observed, not over a fixed 12: a
      // company we started indexing four months ago has a four-month history,
      // and dividing it by twelve would invent a burst that is coverage.
      const mean8k = priorMonths > 0 ? Math.round((prior8k / priorMonths) * 100) / 100 : null;
      const known = seenForms.get(b.slug) ?? new Set<string>();
      const firstSeen = Array.from(b.forms)
        .filter((form) => !known.has(form))
        .sort();
      const lags = b.periodicLags.slice().sort((x, y) => x - y);
      return {
        company: b.name,
        companySlug: b.slug,
        ticker: b.ticker ?? '',
        filings: b.filings,
        eightKFilings: b.eightK,
        trailingMonthlyMean8K: mean8k,
        eightKAboveTrailingMean: mean8k === null ? null : Math.round((b.eightK - mean8k) * 100) / 100,
        monthsOfPriorHistory: priorMonths,
        formsFirstSeenThisMonth: firstSeen.join('; '),
        lateFilingNotices: b.lateNotices,
        periodicFilings: lags.length,
        medianDaysAfterPeriodEnd: lags.length ? lags[Math.floor(lags.length / 2)] : null,
      };
    })
    .sort(
      (a, b) =>
        b.filings - a.filings ||
        b.eightKFilings - a.eightKFilings ||
        a.company.localeCompare(b.company)
    );

  const firstEverForms = cadenceRows.filter((r) => r.formsFirstSeenThisMonth !== '').length;
  const lateNoticeTotal = cadenceRows.reduce((s, r) => s + r.lateFilingNotices, 0);

  // --- Headline -------------------------------------------------------------
  const companiesWithFilings = new Set(monthFilings.map((f) => f.companySlug)).size;

  const headline: ReportFigure[] = [
    {
      label: 'Open-market insider purchases',
      value: fmtCount(purchases.length),
      detail: `${fmtCount(buyers.size)} distinct insiders${
        priorKey ? ` · ${fmtCount(priorPurchases.length)} in ${periodLabel('monthly', priorKey)}` : ''
      }`,
    },
    {
      label: 'Open-market insider sales',
      value: fmtCount(sales.length),
      detail: `${fmtCount(sellers.size)} distinct insiders${
        priorKey ? ` · ${fmtCount(priorSales.length)} in ${periodLabel('monthly', priorKey)}` : ''
      }`,
    },
    {
      label: 'Disclosed purchase value',
      value: fmtUsd(purchaseValue || null),
      detail: `${fmtCount(purchaseValueDisclosed)} of ${fmtCount(purchases.length)} purchase lines state a price; sales totalled ${fmtUsd(saleValue || null)}`,
    },
    {
      label: '5% holder filings',
      value: fmtCount(positions.length),
      detail: `${fmtCount(firstTimeHolders)} holders with no earlier filing in our records · ${fmtCount(activistForm)} on Schedule 13D`,
    },
    {
      label: 'Filings indexed',
      value: fmtCount(monthFilings.length),
      detail: `Across ${fmtCount(companiesWithFilings)} of ${fmtCount(coveredCompanies.length)} covered issuers`,
    },
    {
      label: 'Lines excluded from the two figures above',
      value: fmtCount(nonDiscretionary),
      detail: 'Grants, tax withholding, exercises and gifts — automatic events, not trades. Broken out in full below.',
    },
  ];

  // --- Tables ---------------------------------------------------------------
  const tradeColumns = [
    { key: 'transactionDate', label: 'Date' },
    { key: 'company', label: 'Company' },
    { key: 'insider', label: 'Insider' },
    { key: 'role', label: 'Role' },
    { key: 'shares', label: 'Shares', numeric: true },
    { key: 'pricePerShare', label: 'Price', numeric: true },
    { key: 'valueUsd', label: 'Value', numeric: true },
  ];

  const tradeRow = (r: TxRow) => ({
    transactionDate: iso(r.transactionDate),
    filingDate: iso(r.filingDate),
    company: r.companyName,
    companySlug: r.companySlug,
    ticker: r.ticker ?? '',
    insider: r.ownerName,
    role: roleOf(r),
    securityTitle: r.securityTitle ?? '',
    derivative: r.derivative ? 'yes' : 'no',
    transactionCode: form4CodeLabel(r.transactionCode),
    shares: r.shares,
    pricePerShare: r.pricePerShare,
    valueUsd: r.valueUsd,
    sharesOwnedAfter: r.sharesOwnedAfter,
    footnotedOnFiling: r.footnoted ? 'yes' : 'no',
    formType: r.formType,
    accessionNumber: r.accessionNumber,
    filing: r.sourceUrl,
  });

  const sortTrades = (rows: TxRow[]) =>
    rows
      .slice()
      .sort(
        (a, b) =>
          (b.valueUsd ?? -1) - (a.valueUsd ?? -1) ||
          (b.shares ?? -1) - (a.shares ?? -1) ||
          a.companyName.localeCompare(b.companyName)
      )
      .map(tradeRow);

  const tables: ReportTable[] = [
    {
      id: 'open-market-purchases',
      label: `Open-market insider purchases, ${periodLabel('monthly', period)}`,
      description:
        'Every transaction an officer, director or 10% owner reported under code P — a purchase they chose to make in the market — largest disclosed value first.',
      columns: tradeColumns,
      rows: sortTrades(purchases),
      publicRowLimit: 10,
      note: 'Code P only. A grant, an option exercise and a dividend reinvestment are all acquisitions, and none of them is a purchase; they appear in the transaction-class table instead. A blank value means the filer disclosed no price, not a price of zero.',
    },
    {
      id: 'open-market-sales',
      label: `Open-market insider sales, ${periodLabel('monthly', period)}`,
      description:
        'Every transaction reported under code S — a sale in the market — largest disclosed value first.',
      columns: tradeColumns,
      rows: sortTrades(sales),
      publicRowLimit: 10,
      note: 'Code S only. Shares withheld by the issuer to cover taxes (code F) and dispositions back to the issuer (code D) are excluded: they are not sales into the market. Many code-S lines are executed under a pre-arranged Rule 10b5-1 plan adopted months earlier; the Form 4 checkbox for that is not parsed here, so this table does not distinguish them.',
    },
    {
      id: 'by-company',
      label: 'Insider activity by company',
      description:
        'Open-market purchases and sales per company, with the compensation flow shown separately so it is visible and never mixed in.',
      columns: [
        { key: 'company', label: 'Company' },
        { key: 'ticker', label: 'Ticker' },
        { key: 'purchaseLines', label: 'Purchases', numeric: true },
        { key: 'saleLines', label: 'Sales', numeric: true },
        { key: 'netOpenMarketShares', label: 'Net shares', numeric: true },
        { key: 'netOpenMarketValueUsd', label: 'Net value', numeric: true },
        { key: 'grantShares', label: 'Granted shares', numeric: true },
      ],
      rows: companyRows,
      publicRowLimit: 10,
      note: 'Net shares and net value are purchases minus sales, over codes P and S only. Granted shares and shares withheld for tax are reported beside them and are NOT part of either net figure. A net number is an arithmetic difference between two disclosures; it is not a rating of the company.',
    },
    {
      id: 'transaction-classes',
      label: 'Every transaction class in the month',
      description:
        'The full denominator: every Form 4 line we parsed, grouped by what the transaction code says happened, and marked according to whether the headline figures count it.',
      columns: [
        { key: 'transactionClass', label: 'Class' },
        { key: 'codes', label: 'Codes' },
        { key: 'lines', label: 'Lines', numeric: true },
        { key: 'shares', label: 'Shares', numeric: true },
        { key: 'disclosedValueUsd', label: 'Disclosed value', numeric: true },
        { key: 'countedInHeadline', label: 'In headline' },
      ],
      rows: classRows,
      publicRowLimit: 10,
      note: 'Codes and their meanings come from the SEC Form 4 general instructions. A code outside those instructions is stored as filed and classed "other" rather than guessed at.',
    },
    {
      id: 'institutional-positions',
      label: `Schedule 13D and 13G filings, ${periodLabel('monthly', period)}`,
      description:
        'Holders of 5% or more of a tracked company, as they reported themselves, with the change against that same holder’s previous filing on the same issuer where we hold one.',
      columns: [
        { key: 'filingDate', label: 'Filed' },
        { key: 'company', label: 'Company' },
        { key: 'holder', label: 'Holder' },
        { key: 'form', label: 'Form' },
        { key: 'percentOfClass', label: '% of class', numeric: true },
        { key: 'percentPointChange', label: 'Change (pts)', numeric: true },
        { key: 'sharesBeneficiallyOwned', label: 'Shares', numeric: true },
      ],
      rows: positionRows,
      publicRowLimit: 10,
      note: `Percent of class is the figure the filer stated; we do not recompute it against a share count of our own. A blank change means we hold no earlier filing by that holder on that issuer, which is not the same as a new position. Schedule 13D is the long form filed by holders who do not certify passive intent and 13G is the short form for passive holders and qualified institutions — that describes the FORM, not what the holder will do. Structured filings only, from ${SCHEDULE_13_STRUCTURED_SINCE}.`,
    },
    {
      id: 'filing-cadence',
      label: 'Filing cadence by issuer',
      description:
        'How much each covered issuer filed this month, against its own trailing monthly average, with late-filing notifications and periodic-report lag.',
      columns: [
        { key: 'company', label: 'Company' },
        { key: 'filings', label: 'Filings', numeric: true },
        { key: 'eightKFilings', label: '8-K', numeric: true },
        { key: 'trailingMonthlyMean8K', label: 'Trailing 8-K/mo', numeric: true },
        { key: 'eightKAboveTrailingMean', label: 'Above average', numeric: true },
        { key: 'formsFirstSeenThisMonth', label: 'First seen' },
        { key: 'lateFilingNotices', label: 'Late notices', numeric: true },
      ],
      rows: cadenceRows,
      publicRowLimit: 10,
      note: 'The trailing average is computed over the months we actually hold filings for that company, printed beside it as months of prior history — dividing a short history by twelve would manufacture a burst that is really coverage. "First seen" means the first filing of that form type in OUR records, which for a company we began indexing recently is a statement about us. A late-filing notice is Form NT 10-K or NT 10-Q, which the issuer files itself.',
    },
    {
      id: 'filings',
      label: 'Filings behind these tables',
      description:
        'Every filing indexed in the month, with the form, the period it covers, any 8-K item codes, and its accession number.',
      columns: [
        { key: 'filingDate', label: 'Filed' },
        { key: 'company', label: 'Company' },
        { key: 'form', label: 'Form' },
        { key: 'reportDate', label: 'Period covered' },
        { key: 'items', label: '8-K items' },
        { key: 'accessionNumber', label: 'Accession' },
      ],
      rows: monthFilings.map((f) => ({
        filingDate: iso(f.filingDate),
        company: f.companyName,
        companySlug: f.companySlug,
        ticker: f.ticker ?? '',
        form: f.form,
        reportDate: f.reportDate ? iso(f.reportDate) : '',
        items: f.items ?? '',
        accessionNumber: f.accessionNumber,
        filing: f.sourceUrl,
      })),
      publicRowLimit: 10,
      note: 'Item codes are reproduced exactly as EDGAR records them and are not translated into descriptions here. Every row links to the filing on sec.gov.',
    },
  ];

  const coverage: string[] = [
    `This edition sees ${transactions.length} Form 4 and Form 5 transaction lines, ${positions.length} Schedule 13D/G holder rows and ${monthFilings.length} indexed filings for the month, across ${coveredCompanies.length} issuers we hold an EDGAR filing index for.`,
    `Of those transaction lines, ${openMarket.length} are open-market trades (codes P and S) and ${nonDiscretionary} are not. Only the open-market lines are counted in the purchase and sale figures. The transaction-class table publishes the rest in full so the exclusion is visible rather than asserted.`,
    'Coverage is the tracked companies that carry a ticker and resolve to an SEC filer. Foreign-listed and privately held space companies file none of these forms, so their absence from every table here says nothing about them.',
    'A company that has since delisted keeps its filing history but drops out of the exchange ticker map, so it is covered only where we already hold its CIK. Its history stops at its last filing, which is a fact about the company rather than a gap in this release.',
    `Schedule 13D and 13G became structured XML submissions on ${SCHEDULE_13_STRUCTURED_SINCE}. Earlier filings are free-text cover pages: we index them but do not parse share counts out of them, and no figure on this page is drawn from one.`,
    `Our parsed SEC history begins ${INSIDER_DEFAULT_SINCE}. That is a backfill boundary, not a claim about what happened before it.`,
    'Form 4s are filed within two business days of a transaction and Form 5s can report a transaction months later, so a month’s figures can grow after the month ends. Each edition states the date it was computed, and a recomputation that moves is a correction rather than a revision of history.',
    'Amendments are counted as filed. A 4/A restating an earlier line appears as its own row rather than silently overwriting the original, because both were filed and both are part of the record.',
    'Form 3 (an insider’s initial statement of holdings) is not imported at all. It reports a standing position rather than a transaction, and counting it as one would invent a trade on the day every director joined a board.',
    'The Form 4 Rule 10b5-1 checkbox is not parsed, so this release cannot tell you whether a sale was executed under a pre-arranged plan adopted months earlier. That distinction matters and we do not have it.',
    'Nothing here is adjusted for share splits, and share counts are as reported on each filing.',
    'Every figure on this page is a count, a sum or a difference over our own rows. Nothing is model-generated, estimated, projected or scored, and no figure is a recommendation.',
  ];

  return {
    releaseId: RELEASE_ID,
    period,
    periodLabel: periodLabel('monthly', period),
    title,
    asOf,
    computedAt,
    headline,
    tables,
    notice: INSIDER_NOTICE,
    coverage,
    inputHash: hashEditionContent(headline, tables),
    empty: false,
  };
}
