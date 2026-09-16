/**
 * @jest-environment node
 *
 * SEC-derived investor signals.
 *
 * Two kinds of guard live here, and both exist because the failure is a wrong
 * number in a product sold to investors rather than a crash somebody notices:
 *
 *   1. THE PARSERS READ WHAT THE FILING SAYS. Holdings are not transactions, a
 *      joint filing is one block of shares and not several, a $0 grant has no
 *      value rather than a value of zero, and Schedule 13D and 13G are two
 *      different schemas that must both be read.
 *
 *   2. THE PRODUCT REPORTS RATHER THAN ADVISES. The one classification we make
 *      keeps compensation events out of the purchase and sale counts, and no
 *      file in the path is allowed to acquire directional language or a model
 *      import.
 *
 * The XML below is trimmed but structurally faithful to real filings: the
 * Form 4 follows Rocket Lab accession 0002001011-26-000136 and the Schedules
 * follow 0002100119-26-001449 (13G, Vanguard) and 0001753926-26-000566
 * (13D/A, Peter Beck).
 */

import fs from 'fs';
import path from 'path';

import {
  FORM4_CODES,
  classifyForm4Code,
  form4Code,
  form4CodeLabel,
  isDiscretionaryMarketTrade,
  ownerRoles,
} from '../market-signals/form4-codes';
import {
  indexedFilingsFrom,
  isAmendmentForm,
  isSchedule13,
  isSchedule13D,
  isSchedule13G,
  parseForm4,
  parseSchedule13,
  rawDocumentName,
  transactionValue,
  usDate,
  utcDate,
} from '../market-signals/sec-filing-parsers';
import { getRelease } from '../research-releases';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FORM4_XML = `<?xml version="1.0"?>
<ownershipDocument>
  <schemaVersion>X0609</schemaVersion>
  <documentType>4</documentType>
  <periodOfReport>2026-09-02</periodOfReport>
  <issuer>
    <issuerCik>0001819994</issuerCik>
    <issuerName>Rocket Lab Corp</issuerName>
    <issuerTradingSymbol>RKLB</issuerTradingSymbol>
  </issuer>
  <reportingOwner>
    <reportingOwnerId>
      <rptOwnerCik>0001509421</rptOwnerCik>
      <rptOwnerName>Spice Adam C.</rptOwnerName>
    </reportingOwnerId>
    <reportingOwnerRelationship>
      <isDirector>0</isDirector>
      <isOfficer>1</isOfficer>
      <isTenPercentOwner>0</isTenPercentOwner>
      <isOther>0</isOther>
      <officerTitle>Chief Financial Officer</officerTitle>
    </reportingOwnerRelationship>
  </reportingOwner>
  <reportingOwner>
    <reportingOwnerId>
      <rptOwnerCik>0001509999</rptOwnerCik>
      <rptOwnerName>Spice Family Trust</rptOwnerName>
    </reportingOwnerId>
    <reportingOwnerRelationship>
      <isDirector>0</isDirector>
      <isOfficer>0</isOfficer>
      <isTenPercentOwner>0</isTenPercentOwner>
      <isOther>1</isOther>
    </reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-09-02</value></transactionDate>
      <transactionCoding>
        <transactionFormType>4</transactionFormType>
        <transactionCode>M</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares><value>140157</value></transactionShares>
        <transactionPricePerShare><value>1.09</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts>
        <sharesOwnedFollowingTransaction><value>1296124</value></sharesOwnedFollowingTransaction>
      </postTransactionAmounts>
      <ownershipNature>
        <directOrIndirectOwnership><value>D</value></directOrIndirectOwnership>
      </ownershipNature>
    </nonDerivativeTransaction>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-09-02</value></transactionDate>
      <transactionCoding>
        <transactionFormType>4</transactionFormType>
        <transactionCode>S</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares>
          <value>67257</value>
          <footnoteId id="F1"/>
        </transactionShares>
        <transactionPricePerShare>
          <value>62.2564</value>
          <footnoteId id="F2"/>
        </transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts>
        <sharesOwnedFollowingTransaction><value>1228867</value></sharesOwnedFollowingTransaction>
      </postTransactionAmounts>
      <ownershipNature>
        <directOrIndirectOwnership><value>D</value></directOrIndirectOwnership>
      </ownershipNature>
    </nonDerivativeTransaction>
    <nonDerivativeHolding>
      <securityTitle><value>Common Stock</value></securityTitle>
      <postTransactionAmounts>
        <sharesOwnedFollowingTransaction><value>400000</value></sharesOwnedFollowingTransaction>
      </postTransactionAmounts>
      <ownershipNature>
        <directOrIndirectOwnership><value>I</value></directOrIndirectOwnership>
      </ownershipNature>
    </nonDerivativeHolding>
  </nonDerivativeTable>
  <derivativeTable>
    <derivativeTransaction>
      <securityTitle><value>Restricted Stock Unit</value></securityTitle>
      <transactionDate><value>2026-09-01</value></transactionDate>
      <transactionCoding>
        <transactionFormType>4</transactionFormType>
        <transactionCode>A</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares><value>50000</value></transactionShares>
        <transactionPricePerShare><value>0</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <ownershipNature>
        <directOrIndirectOwnership><value>D</value></directOrIndirectOwnership>
      </ownershipNature>
    </derivativeTransaction>
  </derivativeTable>
</ownershipDocument>`;

const SCHEDULE_13G_XML = `<?xml version="1.0" encoding="UTF-8"?>
<edgarSubmission>
<schemaVersion>X0202</schemaVersion>
<headerData><filerInfo><liveTestFlag>LIVE</liveTestFlag></filerInfo></headerData>
<formData>
<coverPageHeader>
<securitiesClassTitle>Common Stock</securitiesClassTitle>
<eventDateRequiresFilingThisStatement>06/30/2026</eventDateRequiresFilingThisStatement>
<issuerInfo>
<issuerCik>0001819994</issuerCik>
<issuerName>Rocket Lab Corp</issuerName>
<issuerCusips><issuerCusipNumber>773121108</issuerCusipNumber></issuerCusips>
</issuerInfo>
</coverPageHeader>
<coverPageHeaderReportingPersonDetails>
<reportingPersonName>Vanguard Capital Management</reportingPersonName>
<citizenshipOrOrganization>PA</citizenshipOrOrganization>
<reportingPersonBeneficiallyOwnedNumberOfShares>
<soleVotingPower>4781366</soleVotingPower>
<sharedVotingPower>0</sharedVotingPower>
<soleDispositivePower>30080579</soleDispositivePower>
<sharedDispositivePower>0</sharedDispositivePower>
</reportingPersonBeneficiallyOwnedNumberOfShares>
<reportingPersonBeneficiallyOwnedAggregateNumberOfShares>30080579</reportingPersonBeneficiallyOwnedAggregateNumberOfShares>
<classPercent>5.19</classPercent>
<typeOfReportingPerson>IA</typeOfReportingPerson>
</coverPageHeaderReportingPersonDetails>
<coverPageHeaderReportingPersonDetails>
<reportingPersonName>Vanguard Fiduciary Trust Company</reportingPersonName>
<citizenshipOrOrganization>PA</citizenshipOrOrganization>
<reportingPersonBeneficiallyOwnedNumberOfShares>
<soleVotingPower>100</soleVotingPower>
<sharedVotingPower>0</sharedVotingPower>
<soleDispositivePower>200</soleDispositivePower>
<sharedDispositivePower>0</sharedDispositivePower>
</reportingPersonBeneficiallyOwnedNumberOfShares>
<reportingPersonBeneficiallyOwnedAggregateNumberOfShares>200</reportingPersonBeneficiallyOwnedAggregateNumberOfShares>
<classPercent>0.1</classPercent>
<typeOfReportingPerson>BK</typeOfReportingPerson>
</coverPageHeaderReportingPersonDetails>
</formData>
</edgarSubmission>`;

const SCHEDULE_13D_XML = `<?xml version="1.0" encoding="UTF-8"?>
<edgarSubmission>
<headerData><filerInfo><liveTestFlag>LIVE</liveTestFlag></filerInfo></headerData>
<formData>
<coverPageHeader>
<amendmentNo>5</amendmentNo>
<securitiesClassTitle>Common Stock, $0.0001 par value per share</securitiesClassTitle>
<dateOfEvent>03/27/2026</dateOfEvent>
<issuerInfo>
<issuerCIK>0001819994</issuerCIK>
<issuerCusips><issuerCusipNumber>773121108</issuerCusipNumber></issuerCusips>
<issuerName>Rocket Lab Corp</issuerName>
</issuerInfo>
</coverPageHeader>
<reportingPersons>
<reportingPersonInfo>
<reportingPersonCIK>0001881842</reportingPersonCIK>
<reportingPersonName>Beck Peter</reportingPersonName>
<fundType>OO</fundType>
<citizenshipOrOrganization>Q2</citizenshipOrOrganization>
<soleVotingPower>491930.00</soleVotingPower>
<sharedVotingPower>45951250.00</sharedVotingPower>
<soleDispositivePower>491930.00</soleDispositivePower>
<sharedDispositivePower>45951250.00</sharedDispositivePower>
<aggregateAmountOwned>46443180.00</aggregateAmountOwned>
<percentOfClass>7.51</percentOfClass>
<typeOfReportingPerson>IN</typeOfReportingPerson>
</reportingPersonInfo>
</reportingPersons>
</formData>
</edgarSubmission>`;

// ---------------------------------------------------------------------------
// 1. The one classification that matters
// ---------------------------------------------------------------------------

describe('Form 4 transaction codes', () => {
  it('treats ONLY P and S as trades the insider chose to make', () => {
    const discretionary = FORM4_CODES.filter((c) => c.discretionaryMarketTrade).map((c) => c.code);
    expect(discretionary.sort()).toEqual(['P', 'S']);
  });

  it('refuses to call a grant a purchase or a tax withholding a sale', () => {
    // The mistake this whole subsystem exists to avoid.
    expect(isDiscretionaryMarketTrade('A')).toBe(false);
    expect(isDiscretionaryMarketTrade('F')).toBe(false);
    expect(isDiscretionaryMarketTrade('M')).toBe(false);
    expect(isDiscretionaryMarketTrade('D')).toBe(false);
    expect(isDiscretionaryMarketTrade('G')).toBe(false);
    expect(classifyForm4Code('A')).toBe('award-or-grant');
    expect(classifyForm4Code('F')).toBe('tax-withholding');
    expect(classifyForm4Code('P')).toBe('open-market-purchase');
    expect(classifyForm4Code('S')).toBe('open-market-sale');
  });

  it('classes an unknown code as other rather than guessing', () => {
    expect(form4Code('Q')).toBeNull();
    expect(classifyForm4Code('Q')).toBe('other');
    expect(isDiscretionaryMarketTrade('Q')).toBe(false);
    expect(form4CodeLabel('Q')).toContain('not in the Form 4 instructions');
    expect(classifyForm4Code(null)).toBe('other');
  });

  it('has one entry per code and normalises case and whitespace', () => {
    const codes = FORM4_CODES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(form4Code(' p ')?.code).toBe('P');
  });

  it('lists every role ticked on a filing and invents none', () => {
    expect(
      ownerRoles({ isDirector: true, isOfficer: true, isTenPercentOwner: false, isOther: false })
    ).toEqual(['Director', 'Officer']);
    expect(
      ownerRoles({ isDirector: false, isOfficer: false, isTenPercentOwner: false, isOther: false })
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Form 4 parsing
// ---------------------------------------------------------------------------

describe('parseForm4', () => {
  const parsed = parseForm4(FORM4_XML);

  it('reads the issuer and the document type as filed', () => {
    expect(parsed.documentType).toBe('4');
    expect(parsed.issuerCik).toBe('0001819994');
    expect(parsed.issuerName).toBe('Rocket Lab Corp');
    expect(parsed.issuerTradingSymbol).toBe('RKLB');
    expect(parsed.periodOfReport).toBe('2026-09-02');
  });

  it('keeps every reporting owner on a joint filing, in order', () => {
    expect(parsed.owners.map((o) => o.name)).toEqual(['Spice Adam C.', 'Spice Family Trust']);
    expect(parsed.owners[0].isOfficer).toBe(true);
    expect(parsed.owners[0].isDirector).toBe(false);
    expect(parsed.owners[0].officerTitle).toBe('Chief Financial Officer');
    expect(parsed.owners[1].isOther).toBe(true);
  });

  it('SKIPS holdings — a standing position is not a transaction', () => {
    // The fixture carries a nonDerivativeHolding of 400,000 shares. If it were
    // imported it would read as a 400,000-share trade that never happened.
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.transactions.map((t) => t.lineKey)).toEqual(['nd-0', 'nd-1', 'd-0']);
    expect(parsed.transactions.some((t) => t.shares === 400000)).toBe(false);
  });

  it('reads each transaction line literally', () => {
    const sale = parsed.transactions.find((t) => t.transactionCode === 'S')!;
    expect(sale.shares).toBe(67257);
    expect(sale.pricePerShare).toBeCloseTo(62.2564, 4);
    expect(sale.acquiredDisposed).toBe('D');
    expect(sale.sharesOwnedAfter).toBe(1228867);
    expect(sale.directOrIndirect).toBe('D');
    expect(sale.derivative).toBe(false);
  });

  it('flags a line whose amounts carry a footnote on the filing', () => {
    const sale = parsed.transactions.find((t) => t.transactionCode === 'S')!;
    const exercise = parsed.transactions.find((t) => t.transactionCode === 'M')!;
    expect(sale.footnoted).toBe(true);
    expect(exercise.footnoted).toBe(false);
  });

  it('marks derivative-table lines as derivative', () => {
    const grant = parsed.transactions.find((t) => t.lineKey === 'd-0')!;
    expect(grant.derivative).toBe(true);
    expect(grant.transactionCode).toBe('A');
    expect(grant.securityTitle).toBe('Restricted Stock Unit');
  });

  it('returns an empty transaction list for a document it cannot read', () => {
    expect(parseForm4('<ownershipDocument></ownershipDocument>').transactions).toEqual([]);
  });
});

describe('transactionValue', () => {
  it('multiplies shares by a disclosed price', () => {
    expect(transactionValue(100, 2.5)).toBe(250);
  });

  it('has NO value when the price is zero or missing — never a value of zero', () => {
    // A grant priced at $0 contributing "0" would drag every average down
    // while looking like a real observation.
    expect(transactionValue(50000, 0)).toBeNull();
    expect(transactionValue(50000, null)).toBeNull();
    expect(transactionValue(null, 12)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Schedule 13D and 13G — two schemas
// ---------------------------------------------------------------------------

describe('parseSchedule13', () => {
  it('reads the 13G shape, keeping every reporting person in a group filing', () => {
    const p = parseSchedule13(SCHEDULE_13G_XML);
    expect(p.issuerCik).toBe('0001819994');
    expect(p.cusip).toBe('773121108');
    expect(p.eventDate).toBe('06/30/2026');
    expect(p.holders).toHaveLength(2);
    expect(p.holders[0]).toMatchObject({
      holderKey: 'rp-0',
      name: 'Vanguard Capital Management',
      personType: 'IA',
      sharesBeneficiallyOwned: 30080579,
      percentOfClass: 5.19,
      soleVoting: 4781366,
      soleDispositive: 30080579,
    });
    expect(p.holders[1].name).toBe('Vanguard Fiduciary Trust Company');
  });

  it('reads the 13D shape, which uses entirely different element names', () => {
    // Reading only the 13G shape would return zero holders here — silently
    // losing the family of filings that matters most.
    const p = parseSchedule13(SCHEDULE_13D_XML);
    expect(p.issuerCik).toBe('0001819994');
    expect(p.eventDate).toBe('03/27/2026');
    expect(p.holders).toHaveLength(1);
    expect(p.holders[0]).toMatchObject({
      name: 'Beck Peter',
      cik: '0001881842',
      personType: 'IN',
      sharesBeneficiallyOwned: 46443180,
      percentOfClass: 7.51,
      sharedVoting: 45951250,
    });
  });

  it('returns no holders for a document matching neither schema', () => {
    // The caller counts this as unparsed, NOT as "nobody holds 5%".
    expect(parseSchedule13('<html><body>Item 1. Issuer</body></html>').holders).toEqual([]);
  });

  it('recognises every spelling EDGAR uses for the two families', () => {
    for (const form of ['SC 13D', 'SC 13D/A', 'SCHEDULE 13D', 'SCHEDULE 13D/A']) {
      expect(isSchedule13D(form)).toBe(true);
      expect(isSchedule13G(form)).toBe(false);
      expect(isSchedule13(form)).toBe(true);
    }
    for (const form of ['SC 13G', 'SC 13G/A', 'SCHEDULE 13G', 'SCHEDULE 13G/A']) {
      expect(isSchedule13G(form)).toBe(true);
      expect(isSchedule13D(form)).toBe(false);
    }
    expect(isSchedule13('13F-HR')).toBe(false);
    expect(isSchedule13('8-K')).toBe(false);
    expect(isAmendmentForm('SCHEDULE 13G/A')).toBe(true);
    expect(isAmendmentForm('SCHEDULE 13G')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. The submissions index and document paths
// ---------------------------------------------------------------------------

describe('the submissions index', () => {
  it('reads the columnar block into rows, keeping 8-K items and the period covered', () => {
    const rows = indexedFilingsFrom({
      form: ['8-K', '10-Q'],
      filingDate: ['2026-09-15', '2026-08-07'],
      reportDate: ['2026-09-15', '2026-06-30'],
      acceptanceDateTime: ['2026-09-15T16:31:00.000Z', ''],
      accessionNumber: ['0001753926-26-001769', '0001753926-26-001500'],
      fileNumber: ['001-39560', '001-39560'],
      items: ['7.01,8.01,9.01', ''],
      primaryDocument: ['rklb-8k.htm', 'rklb-10q.htm'],
      size: [12345, 67890],
      isXBRL: [1, 1],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].items).toBe('7.01,8.01,9.01');
    expect(rows[0].isXBRL).toBe(true);
    expect(rows[1].items).toBeNull();
    expect(rows[1].reportDate).toBe('2026-06-30');
    expect(rows[1].acceptanceDateTime).toBeNull();
  });

  it('drops a row with no accession number rather than keying on an empty string', () => {
    const rows = indexedFilingsFrom({ form: ['4', '4'], accessionNumber: ['', '0001-26-1'] });
    expect(rows).toHaveLength(1);
  });

  it('handles a missing block without throwing', () => {
    expect(indexedFilingsFrom(undefined)).toEqual([]);
    expect(indexedFilingsFrom({})).toEqual([]);
  });

  it('strips the XSL stylesheet prefix to reach the machine-readable document', () => {
    // Getting this wrong parses the stylesheet's HTML output instead of the
    // filing, which is the difference between data and nothing.
    expect(rawDocumentName('xslF345X06/edgardoc.xml')).toBe('edgardoc.xml');
    expect(rawDocumentName('xslSCHEDULE_13G_X02/primary_doc.xml')).toBe('primary_doc.xml');
    expect(rawDocumentName('d628539dsc13da.htm')).toBe('d628539dsc13da.htm');
    expect(rawDocumentName(null)).toBeNull();
  });
});

describe('date readers', () => {
  it('reads an ISO date as UTC midnight and refuses anything else', () => {
    expect(utcDate('2026-09-02')!.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(utcDate('')).toBeNull();
    expect(utcDate('not a date')).toBeNull();
    expect(utcDate(null)).toBeNull();
  });

  it('reads the MM/DD/YYYY form the Schedule 13 XML uses', () => {
    expect(usDate('06/30/2026')!.toISOString()).toBe('2026-06-30T00:00:00.000Z');
    expect(usDate('2026-06-30')!.toISOString()).toBe('2026-06-30T00:00:00.000Z');
    expect(usDate('30/06/2026')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Reporting, not advising
// ---------------------------------------------------------------------------

const PATHS = [
  'src/lib/market-signals/form4-codes.ts',
  'src/lib/market-signals/sec-filing-parsers.ts',
  'src/lib/fetchers/sec-insider-fetcher.ts',
  'src/lib/research-report-insider.ts',
  'src/app/api/research/insider-activity/route.ts',
];

function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
}

/**
 * The same source with the legal notice removed.
 *
 * The notice DISCLAIMS the vocabulary the scan below bans ("no rating, no
 * price target"), so scanning it would fail the file for saying the right
 * thing. Everything outside the notice is still scanned.
 */
function readWithoutNotice(file: string): string {
  return read(file).replace(/export const INSIDER_NOTICE =[\s\S]*?';\n/, '');
}

describe('this is disclosure reporting, not investment advice', () => {
  it('carries a notice naming what SpaceNexus is not', () => {
    const src = read('src/lib/research-report-insider.ts');
    expect(src).toContain('not a registered investment adviser');
    expect(src).toContain('no recommendation to buy, sell or hold');
  });

  it('never acquires directional or advisory language', () => {
    // Words that would turn a filing record into a view. If a future edit adds
    // one, this fails before it reaches a customer.
    const banned = [
      /\bbullish\b/i,
      /\bbearish\b/i,
      /\boutperform\b/i,
      /\bunderperform\b/i,
      /\bprice target\b/i,
      /\bundervalued\b/i,
      /\bovervalued\b/i,
      /\bwe recommend\b/i,
      /\bsignal to buy\b/i,
      /\bstrong buy\b/i,
      /\bconviction\b/i,
    ];
    for (const file of PATHS) {
      const src = readWithoutNotice(file);
      for (const re of banned) {
        expect(`${file}: ${re}` + (re.test(src) ? ' MATCHED' : '')).not.toContain('MATCHED');
      }
    }
  });

  it('calls no model anywhere in the path', () => {
    for (const file of PATHS) {
      const src = read(file);
      expect(src).not.toMatch(/from '@\/lib\/ai-models'/);
      expect(src).not.toMatch(/@anthropic-ai/);
      expect(src).not.toMatch(/\bopenai\b/i);
    }
  });

  it('gates the API route server-side before reading a row', () => {
    const src = read('src/app/api/research/insider-activity/route.ts');
    expect(src).toContain('requireResearchAccess');
    // The gate is resolved before any Prisma call in the handler.
    expect(src.indexOf('requireResearchAccess')).toBeLessThan(src.indexOf('prisma.'));
  });
});

// ---------------------------------------------------------------------------
// 6. The release is on the calendar and honest about its floor
// ---------------------------------------------------------------------------

describe('the Space Insider Activity release', () => {
  const release = getRelease('space-insider-activity')!;

  it('is registered as a monthly series release with a gated export', () => {
    expect(release).toBeDefined();
    expect(release.cadence).toBe('monthly');
    expect(release.surface).toBe('series');
    expect(release.exportHref('2026-08').startsWith('/api/research/')).toBe(true);
    expect(release.href('2026-08')).toBe('/releases/space-insider-activity/2026-08');
  });

  it('names a computation module that exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), release.computedBy))).toBe(true);
  });

  it('states the exclusion rule and the disclaimer in its methodology', () => {
    const method = release.methodology.join(' ');
    expect(method).toContain('CODES P AND S');
    expect(method).toContain('not investment advice');
    expect(method).toContain('2024-12-18');
  });

  it('starts no earlier than the date our parsed history actually begins', () => {
    // The archive must not offer a month we cannot fill.
    expect(release.earliestPeriod).toBe('2025-01');
  });
});
