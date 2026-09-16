/**
 * Parsers for the SEC filing documents behind the investor-signal datasets.
 *
 * PURE ON PURPOSE. No Prisma, no next/*, no fetch, no clock. Splitting these
 * out of the fetcher is what lets the parsing be verified against real filings
 * without a database and tested without a network — and parsing is the part
 * where a mistake becomes a wrong number in a product sold to investors.
 *
 * Every function here is a LITERAL READ of a document. There is no inference
 * step anywhere: a field the filing does not state comes back null rather than
 * derived, defaulted or guessed. Nothing calls a model.
 *
 * Three documents are handled:
 *   - the EDGAR submissions index (JSON), which is all filing cadence needs;
 *   - SEC Form 4 and Form 5 ownership XML;
 *   - structured Schedule 13D / 13G XML (mandatory submissions from
 *     2024-12-18; earlier filings are free text and are never scraped).
 *
 * The regex-over-XML approach is deliberate and matches
 * src/lib/fetchers/sec-form-d-fetcher.ts: these are machine-generated
 * documents with a fixed schema and no mixed content, and a dependency-free
 * reader is one less thing between a filing and a number.
 */

// ---------------------------------------------------------------------------
// The submissions index
// ---------------------------------------------------------------------------

/**
 * One filing as the submissions index describes it. Richer than the Form D
 * fetcher's FilingRef because filing cadence needs the period covered and the
 * 8-K item codes, neither of which that shape carries.
 */
export interface IndexedFiling {
  form: string;
  filingDate: string;
  /** The period the filing COVERS (10-Q quarter end, 8-K event date). */
  reportDate: string | null;
  acceptanceDateTime: string | null;
  accessionNumber: string;
  fileNumber: string | null;
  /** 8-K item codes exactly as filed, e.g. "7.01,8.01,9.01". */
  items: string | null;
  primaryDocument: string | null;
  sizeBytes: number | null;
  isXBRL: boolean;
}

/** The shape of data.sec.gov/submissions/CIK##########.json that we read. */
export interface SubmissionsPayload {
  cik?: string;
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  filings?: {
    recent?: Record<string, unknown[]>;
    files?: Array<{ name: string }>;
  };
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

/** Turn one `filings.recent`-shaped block into rows. */
export function indexedFilingsFrom(recent: Record<string, unknown[]> | undefined): IndexedFiling[] {
  if (!recent || !Array.isArray(recent.form)) return [];
  const form = recent.form as string[];
  const get = (key: string) => (recent[key] as unknown[]) ?? [];
  const filingDate = get('filingDate') as string[];
  const reportDate = get('reportDate') as string[];
  const acceptance = get('acceptanceDateTime') as string[];
  const accession = get('accessionNumber') as string[];
  const fileNumber = get('fileNumber') as string[];
  const items = get('items') as string[];
  const primaryDocument = get('primaryDocument') as string[];
  const size = get('size');
  const isXBRL = get('isXBRL');

  const out: IndexedFiling[] = [];
  for (let i = 0; i < form.length; i++) {
    if (!accession[i]) continue;
    out.push({
      form: form[i] ?? '',
      filingDate: filingDate[i] ?? '',
      reportDate: reportDate[i] || null,
      acceptanceDateTime: acceptance[i] || null,
      accessionNumber: accession[i],
      fileNumber: fileNumber[i] || null,
      items: items[i] || null,
      primaryDocument: primaryDocument[i] || null,
      sizeBytes: num(size[i]),
      isXBRL: num(isXBRL[i]) === 1,
    });
  }
  return out;
}

/**
 * The RAW document behind a filing.
 *
 * EDGAR's `primaryDocument` for an ownership or Schedule 13 filing points at
 * the XSL-rendered view ("xslF345X06/edgardoc.xml"), which is HTML. The
 * machine-readable original sits at the same path with that prefix removed.
 * Getting this wrong is the difference between parsing a filing and parsing a
 * stylesheet's output.
 */
export function rawDocumentName(primaryDocument: string | null | undefined): string | null {
  if (!primaryDocument) return null;
  const slash = primaryDocument.indexOf('/');
  if (slash > 0 && /^xsl/i.test(primaryDocument.slice(0, slash))) {
    return primaryDocument.slice(slash + 1);
  }
  return primaryDocument;
}

// ---------------------------------------------------------------------------
// XML reading helpers — the same literal-read discipline as the Form D parser
// ---------------------------------------------------------------------------

function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m ? m[1].trim() : null;
}

function blocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/** `<wrapper><value>X</value></wrapper>` — the shape ownership XML uses. */
function valueOf(xml: string, wrapper: string): string | null {
  const block = new RegExp(`<${wrapper}>([\\s\\S]*?)</${wrapper}>`, 'i').exec(xml);
  if (!block) return null;
  const v = /<value>([\s\S]*?)<\/value>/i.exec(block[1]);
  return v ? v[1].trim() : null;
}

function numberOf(raw: string | null): number | null {
  if (raw === null) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function flag(xml: string, name: string): boolean {
  const raw = (tag(xml, name) ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true';
}

/** YYYY-MM-DD as a UTC Date, or null. Never guesses a date. */
export function utcDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** MM/DD/YYYY, which is how Schedule 13 XML writes its dates. */
export function usDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return utcDate(value);
  const d = new Date(`${m[3]}-${m[1]}-${m[2]}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Form 4 / Form 5 parsing
// ---------------------------------------------------------------------------

export interface Form4Owner {
  cik: string | null;
  name: string;
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  isOther: boolean;
  officerTitle: string | null;
}

export interface Form4Transaction {
  /** Stable within the filing: "nd-0", "d-3". Used for idempotent upserts. */
  lineKey: string;
  derivative: boolean;
  securityTitle: string | null;
  transactionDate: string | null;
  transactionCode: string | null;
  /** "A" acquired or "D" disposed, as coded on the filing. */
  acquiredDisposed: string | null;
  shares: number | null;
  pricePerShare: number | null;
  sharesOwnedAfter: number | null;
  /** "D" direct or "I" indirect. */
  directOrIndirect: string | null;
  /** TRUE when any reported amount on the line carries a footnote. */
  footnoted: boolean;
}

export interface ParsedForm4 {
  documentType: string | null;
  periodOfReport: string | null;
  issuerCik: string | null;
  issuerName: string | null;
  issuerTradingSymbol: string | null;
  owners: Form4Owner[];
  transactions: Form4Transaction[];
}

function parseOwner(block: string): Form4Owner | null {
  const name = tag(block, 'rptOwnerName');
  if (!name) return null;
  const rel = /<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/i.exec(block)?.[1] ?? '';
  return {
    cik: tag(block, 'rptOwnerCik'),
    name: name.replace(/\s+/g, ' ').trim(),
    isDirector: flag(rel, 'isDirector'),
    isOfficer: flag(rel, 'isOfficer'),
    isTenPercentOwner: flag(rel, 'isTenPercentOwner'),
    isOther: flag(rel, 'isOther'),
    officerTitle: tag(rel, 'officerTitle') || null,
  };
}

function parseTransactionBlock(block: string, lineKey: string, derivative: boolean): Form4Transaction {
  const amounts = /<transactionAmounts>([\s\S]*?)<\/transactionAmounts>/i.exec(block)?.[1] ?? '';
  const coding = /<transactionCoding>([\s\S]*?)<\/transactionCoding>/i.exec(block)?.[1] ?? '';
  const post = /<postTransactionAmounts>([\s\S]*?)<\/postTransactionAmounts>/i.exec(block)?.[1] ?? '';
  const nature = /<ownershipNature>([\s\S]*?)<\/ownershipNature>/i.exec(block)?.[1] ?? '';

  return {
    lineKey,
    derivative,
    securityTitle: valueOf(block, 'securityTitle'),
    transactionDate: valueOf(block, 'transactionDate'),
    transactionCode: tag(coding, 'transactionCode'),
    acquiredDisposed: valueOf(amounts, 'transactionAcquiredDisposedCode'),
    shares: numberOf(valueOf(amounts, 'transactionShares')),
    pricePerShare: numberOf(valueOf(amounts, 'transactionPricePerShare')),
    sharesOwnedAfter: numberOf(valueOf(post, 'sharesOwnedFollowingTransaction')),
    directOrIndirect: valueOf(nature, 'directOrIndirectOwnership'),
    footnoted: /<footnoteId\b/i.test(amounts),
  };
}

/**
 * Parse an ownership document. Every returned field is a literal reading of
 * the XML; there is no inference step anywhere in here.
 *
 * HOLDINGS ARE NOT TRANSACTIONS. `<nonDerivativeHolding>` and
 * `<derivativeHolding>` blocks state a standing position and carry no
 * transaction code. They are skipped, not defaulted to a zero-share trade.
 */
export function parseForm4(xml: string): ParsedForm4 {
  const issuer = /<issuer>([\s\S]*?)<\/issuer>/i.exec(xml)?.[1] ?? '';
  const owners: Form4Owner[] = [];
  for (const block of blocks(xml, 'reportingOwner')) {
    const owner = parseOwner(block);
    if (owner) owners.push(owner);
  }

  const transactions: Form4Transaction[] = [];
  const nonDerivative = /<nonDerivativeTable>([\s\S]*?)<\/nonDerivativeTable>/i.exec(xml)?.[1] ?? '';
  blocks(nonDerivative, 'nonDerivativeTransaction').forEach((block, i) => {
    transactions.push(parseTransactionBlock(block, `nd-${i}`, false));
  });
  const derivative = /<derivativeTable>([\s\S]*?)<\/derivativeTable>/i.exec(xml)?.[1] ?? '';
  blocks(derivative, 'derivativeTransaction').forEach((block, i) => {
    transactions.push(parseTransactionBlock(block, `d-${i}`, true));
  });

  return {
    documentType: tag(xml, 'documentType'),
    periodOfReport: tag(xml, 'periodOfReport'),
    issuerCik: tag(issuer, 'issuerCik'),
    issuerName: tag(issuer, 'issuerName'),
    issuerTradingSymbol: tag(issuer, 'issuerTradingSymbol') || null,
    owners,
    transactions,
  };
}

/**
 * Value of a transaction line, or null.
 *
 * Only shares multiplied by a disclosed price. A grant priced at $0, or a line
 * whose price the filer left blank, has NO value — not a value of zero, which
 * would silently drag every average down.
 */
export function transactionValue(shares: number | null, price: number | null): number | null {
  if (shares === null || price === null) return null;
  if (!(shares > 0) || !(price > 0)) return null;
  return Math.round(shares * price * 100) / 100;
}

// ---------------------------------------------------------------------------
// Schedule 13D / 13G parsing (structured submissions only)
// ---------------------------------------------------------------------------

export interface Schedule13Holder {
  /** Stable within the filing: the reporting person's index. */
  holderKey: string;
  name: string;
  /** The holder's own CIK, when the filing states one (13D always does). */
  cik: string | null;
  /** SEC "type of reporting person" code, e.g. IA, BD, IN, HC. As filed. */
  personType: string | null;
  citizenship: string | null;
  sharesBeneficiallyOwned: number | null;
  percentOfClass: number | null;
  soleVoting: number | null;
  sharedVoting: number | null;
  soleDispositive: number | null;
  sharedDispositive: number | null;
}

export interface ParsedSchedule13 {
  submissionType: string | null;
  issuerCik: string | null;
  issuerName: string | null;
  securitiesClassTitle: string | null;
  cusip: string | null;
  /** The event that required the filing, MM/DD/YYYY as filed. */
  eventDate: string | null;
  holders: Schedule13Holder[];
}

/**
 * Parse a structured Schedule 13D or 13G.
 *
 * TWO SCHEMAS, NOT ONE. The SEC published Schedule 13G and Schedule 13D as
 * separate XSDs, and they disagree about almost every element name:
 *
 *   13G  <coverPageHeaderReportingPersonDetails> ... nested
 *        <reportingPersonBeneficiallyOwnedNumberOfShares> powers,
 *        <classPercent>, <issuerCik>, <eventDateRequiresFilingThisStatement>
 *   13D  <reportingPersonInfo> ... FLAT power tags, <aggregateAmountOwned>,
 *        <percentOfClass>, <issuerCIK> (capital), <dateOfEvent>
 *
 * Reading only the 13G shape silently returns zero holders for every 13D,
 * which is the family that matters most — so both are read here, 13G first,
 * and a document matching neither comes back with an empty holder list that
 * the caller counts as unparsed rather than as "nobody holds 5%".
 *
 * A group files one document naming several reporting persons, each with its
 * own share count. Those are separate holders; collapsing them would either
 * lose members or double-count the block.
 */
export function parseSchedule13(xml: string): ParsedSchedule13 {
  const cover = /<coverPageHeader>([\s\S]*?)<\/coverPageHeader>/i.exec(xml)?.[1] ?? '';
  const issuer = /<issuerInfo>([\s\S]*?)<\/issuerInfo>/i.exec(cover)?.[1] ?? '';

  const holders: Schedule13Holder[] = [];

  // --- Schedule 13G shape ---
  blocks(xml, 'coverPageHeaderReportingPersonDetails').forEach((block, i) => {
    const name = tag(block, 'reportingPersonName');
    if (!name) return;
    const powers =
      /<reportingPersonBeneficiallyOwnedNumberOfShares>([\s\S]*?)<\/reportingPersonBeneficiallyOwnedNumberOfShares>/i.exec(
        block
      )?.[1] ?? '';
    holders.push({
      holderKey: `rp-${i}`,
      name: name.replace(/\s+/g, ' ').trim(),
      cik: tag(block, 'reportingPersonCIK'),
      personType: tag(block, 'typeOfReportingPerson'),
      citizenship: tag(block, 'citizenshipOrOrganization'),
      sharesBeneficiallyOwned: numberOf(
        tag(block, 'reportingPersonBeneficiallyOwnedAggregateNumberOfShares')
      ),
      percentOfClass: numberOf(tag(block, 'classPercent')),
      soleVoting: numberOf(tag(powers, 'soleVotingPower')),
      sharedVoting: numberOf(tag(powers, 'sharedVotingPower')),
      soleDispositive: numberOf(tag(powers, 'soleDispositivePower')),
      sharedDispositive: numberOf(tag(powers, 'sharedDispositivePower')),
    });
  });

  // --- Schedule 13D shape ---
  if (holders.length === 0) {
    blocks(xml, 'reportingPersonInfo').forEach((block, i) => {
      const name = tag(block, 'reportingPersonName');
      if (!name) return;
      holders.push({
        holderKey: `rp-${i}`,
        name: name.replace(/\s+/g, ' ').trim(),
        cik: tag(block, 'reportingPersonCIK'),
        personType: tag(block, 'typeOfReportingPerson'),
        citizenship: tag(block, 'citizenshipOrOrganization'),
        sharesBeneficiallyOwned: numberOf(tag(block, 'aggregateAmountOwned')),
        percentOfClass: numberOf(tag(block, 'percentOfClass')),
        soleVoting: numberOf(tag(block, 'soleVotingPower')),
        sharedVoting: numberOf(tag(block, 'sharedVotingPower')),
        soleDispositive: numberOf(tag(block, 'soleDispositivePower')),
        sharedDispositive: numberOf(tag(block, 'sharedDispositivePower')),
      });
    });
  }

  return {
    submissionType: tag(xml, 'submissionType'),
    // 13G spells it issuerCik, 13D spells it issuerCIK. The regexes are
    // case-insensitive, so one lookup covers both; the fallback is here for
    // the reader rather than the parser.
    issuerCik: tag(issuer, 'issuerCik') ?? tag(issuer, 'issuerCIK'),
    issuerName: tag(issuer, 'issuerName'),
    securitiesClassTitle: tag(cover, 'securitiesClassTitle'),
    cusip: tag(issuer, 'issuerCusipNumber') ?? tag(issuer, 'issuerCusip'),
    eventDate:
      tag(cover, 'eventDateRequiresFilingThisStatement') ?? tag(cover, 'dateOfEvent'),
    holders,
  };
}

/** TRUE for the Schedule 13D family, in any of the spellings EDGAR uses. */
export function isSchedule13D(form: string): boolean {
  return /^(SC|SCHEDULE)\s*13D(\/A)?$/i.test(form.trim());
}

/** TRUE for the Schedule 13G family. */
export function isSchedule13G(form: string): boolean {
  return /^(SC|SCHEDULE)\s*13G(\/A)?$/i.test(form.trim());
}

export function isSchedule13(form: string): boolean {
  return isSchedule13D(form) || isSchedule13G(form);
}

export function isAmendmentForm(form: string): boolean {
  return /\/A$/.test(form.trim());
}
