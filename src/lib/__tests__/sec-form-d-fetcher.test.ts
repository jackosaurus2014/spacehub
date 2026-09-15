/**
 * @jest-environment node
 *
 * The Form D pipeline is the backbone of a dataset sold to investors, so the
 * tests here are mostly about what it REFUSES to do: infer a round label,
 * invent an amount, count a fund's own raise as a company's, or attribute
 * another filer's money to us through a loose name match.
 */
import {
  normalizeCompanyName,
  matchCompanyName,
  candidatesFromFullTextSearch,
  padCik,
  parseFormD,
  roundTypeFor,
  formDToRoundDraft,
  latestPerOffering,
  findOverlappingRound,
  filingIndexUrl,
  FORM_D_ELECTRONIC_SINCE,
  type FilingRef,
  type ParsedFormD,
} from '../fetchers/sec-form-d-fetcher';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    companyProfile: { findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    fundingRound: { findMany: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    keyPersonnel: { findFirst: jest.fn(), create: jest.fn() },
    dataProvenance: { upsert: jest.fn() },
    dataSourceRun: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  },
}));

// A trimmed but structurally faithful Form D, modelled on Astranis Space
// Technologies Corp. accession 0001715660-21-000003 (filed 2021-04-19).
const FORM_D_XML = `<?xml version="1.0"?>
<edgarSubmission>
  <primaryIssuer>
    <entityName>Astranis Space Technologies Corp.</entityName>
    <issuerAddress>
      <street1>420 BRYANT STREET</street1>
      <city>SAN FRANCISCO</city>
      <stateOrCountry>CA</stateOrCountry>
    </issuerAddress>
    <entityType>Corporation</entityType>
    <yearOfInc>
      <value>2015</value>
    </yearOfInc>
  </primaryIssuer>
  <relatedPersonsList>
    <relatedPersonInfo>
      <relatedPersonName>
        <firstName>John</firstName>
        <lastName>Gedmark</lastName>
      </relatedPersonName>
      <relatedPersonRelationshipList>
        <relationship>Executive Officer</relationship>
        <relationship>Director</relationship>
      </relatedPersonRelationshipList>
    </relatedPersonInfo>
    <relatedPersonInfo>
      <relatedPersonName>
        <firstName>Ryan</firstName>
        <lastName>McLinko</lastName>
      </relatedPersonName>
      <relatedPersonRelationshipList>
        <relationship>Director</relationship>
      </relatedPersonRelationshipList>
    </relatedPersonInfo>
  </relatedPersonsList>
  <offeringData>
    <industryGroup>
      <industryGroupType>Other Technology</industryGroupType>
    </industryGroup>
    <issuerSize>
      <revenueRange>Decline to Disclose</revenueRange>
    </issuerSize>
    <typeOfFiling>
      <newOrAmendment><isAmendment>false</isAmendment></newOrAmendment>
      <dateOfFirstSale><value>2021-03-19</value></dateOfFirstSale>
    </typeOfFiling>
    <typesOfSecuritiesOffered>
      <isEquityType>true</isEquityType>
    </typesOfSecuritiesOffered>
    <offeringSalesAmounts>
      <totalOfferingAmount>280821725</totalOfferingAmount>
      <totalAmountSold>280821725</totalAmountSold>
      <totalRemaining>0</totalRemaining>
    </offeringSalesAmounts>
  </offeringData>
</edgarSubmission>`;

const FILING: FilingRef = {
  form: 'D',
  filingDate: '2021-04-19',
  accessionNumber: '0001715660-21-000003',
  fileNumber: '021-396288',
  primaryDocument: 'xslFormDX01/primary_doc.xml',
};

describe('normalizeCompanyName', () => {
  it('drops legal suffixes but keeps identifying words', () => {
    expect(normalizeCompanyName('Astranis Space Technologies Corp.')).toBe('astranis space technologies');
    expect(normalizeCompanyName('Rocket Lab USA, Inc.')).toBe('rocket lab');
    expect(normalizeCompanyName('K2 Space Corporation')).toBe('k2 space');
  });

  it('never strips a word that distinguishes two real companies', () => {
    expect(normalizeCompanyName('Astra Space Inc')).toBe('astra space');
    expect(normalizeCompanyName('Astra Inc')).toBe('astra');
    expect(normalizeCompanyName('Astra Space Inc')).not.toBe(normalizeCompanyName('Astra Inc'));
  });
});

describe('matchCompanyName', () => {
  it('accepts exact matches after normalization', () => {
    expect(matchCompanyName('Rocket Lab', 'ROCKET LAB USA, INC.')).toBe('exact');
  });

  it('accepts a distinctive name followed only by industry words', () => {
    expect(matchCompanyName('Astranis', 'Astranis Space Technologies Corp.')).toBe('industry-tail');
    expect(matchCompanyName('Varda Space', 'Varda Space Industries, Inc.')).toBe('industry-tail');
  });

  it('refuses short, generic prefixes that could be another filer', () => {
    // "Astra" is five characters and one token: too weak to claim another
    // issuer's Form D history on.
    expect(matchCompanyName('Astra', 'Astra Space Inc')).toBe('none');
  });

  it('refuses when the extra tokens are not generic industry words', () => {
    expect(matchCompanyName('Sierra', 'Sierra Mortgage Partners LLC')).toBe('none');
    expect(matchCompanyName('Firefly', 'Firefly Biosciences Inc')).toBe('none');
  });

  it('refuses a superstring in the other direction', () => {
    expect(matchCompanyName('Blue Origin Federation', 'Blue Origin')).toBe('none');
  });
});

describe('padCik / filingIndexUrl', () => {
  it('pads and strips consistently', () => {
    expect(padCik('1715660')).toBe('0001715660');
    expect(padCik(1715660)).toBe('0001715660');
  });

  it('builds a citable index URL', () => {
    expect(filingIndexUrl('0001715660', '0001715660-21-000003')).toBe(
      'https://www.sec.gov/Archives/edgar/data/1715660/000171566021000003/0001715660-21-000003-index.htm',
    );
  });
});

describe('parseFormD', () => {
  const parsed = parseFormD(FORM_D_XML);

  it('reads the amounts exactly as filed', () => {
    expect(parsed.totalAmountSold).toBe(280821725);
    expect(parsed.totalOfferingAmount).toBe(280821725);
    expect(parsed.indefiniteOffering).toBe(false);
  });

  it('reads the issuer-stated first-sale date, not the filing date', () => {
    expect(parsed.dateOfFirstSale).toBe('2021-03-19');
  });

  it('reads the incorporation year only when the filing states one', () => {
    expect(parsed.yearOfIncorporation).toBe(2015);
    const vague = parseFormD(FORM_D_XML.replace('<value>2015</value>', '<overFiveYears>true</overFiveYears>'));
    expect(vague.yearOfIncorporation).toBeNull();
  });

  it('extracts officers and directors with their stated relationships', () => {
    expect(parsed.relatedPersons).toHaveLength(2);
    expect(parsed.relatedPersons[0]).toEqual({
      name: 'John Gedmark',
      relationships: ['Executive Officer', 'Director'],
    });
  });

  it('classifies the security type from the filing, not from the amount', () => {
    expect(parsed.securityTypes).toEqual(['equity']);
  });
});

describe('roundTypeFor', () => {
  it('maps filed security types onto round types', () => {
    expect(roundTypeFor(['equity'])).toBe('equity');
    expect(roundTypeFor(['debt'])).toBe('debt');
    expect(roundTypeFor(['convertible'])).toBe('convertible_note');
  });

  it('returns null rather than guessing when nothing was ticked', () => {
    expect(roundTypeFor([])).toBeNull();
    expect(roundTypeFor(['other'])).toBeNull();
  });
});

describe('formDToRoundDraft', () => {
  it('produces a fully cited row', () => {
    const draft = formDToRoundDraft(parseFormD(FORM_D_XML), '0001715660', FILING)!;
    expect(draft.amount).toBe(280821725);
    expect(draft.amountUndisclosed).toBe(false);
    expect(draft.date.toISOString().slice(0, 10)).toBe('2021-03-19');
    expect(draft.sourceUrl).toContain('sec.gov');
    expect(draft.sourceRef).toBe('0001715660-21-000003');
    expect(draft.externalId).toBe('sec-form-d:0001715660-21-000003');
  });

  it('never invents a round label or an investor', () => {
    const draft = formDToRoundDraft(parseFormD(FORM_D_XML), '0001715660', FILING)!;
    expect(draft).not.toHaveProperty('seriesLabel');
    expect(draft).not.toHaveProperty('leadInvestor');
    expect(draft.notes).toContain('not inferred');
  });

  it('refuses a filing where nothing was sold', () => {
    const nothingSold = FORM_D_XML.replace('<totalAmountSold>280821725</totalAmountSold>', '<totalAmountSold>0</totalAmountSold>');
    expect(formDToRoundDraft(parseFormD(nothingSold), '0001715660', FILING)).toBeNull();
  });

  it("refuses a pooled investment fund's own raise", () => {
    const fund = FORM_D_XML.replace(
      '<isEquityType>true</isEquityType>',
      '<isPooledInvestmentFundType>true</isPooledInvestmentFundType>',
    );
    expect(formDToRoundDraft(parseFormD(fund), '0001715660', FILING)).toBeNull();
  });

  it('marks a genuinely indefinite offering as undisclosed rather than zero', () => {
    const indefinite = FORM_D_XML
      .replace('<totalOfferingAmount>280821725</totalOfferingAmount>', '<totalOfferingAmount>Indefinite</totalOfferingAmount>')
      .replace('<totalAmountSold>280821725</totalAmountSold>', '<totalAmountSold>Indefinite</totalAmountSold>');
    const draft = formDToRoundDraft(parseFormD(indefinite), '0001715660', FILING)!;
    expect(draft.amount).toBeNull();
    expect(draft.amountUndisclosed).toBe(true);
  });

  it('falls back to the filing date only when no first-sale date is stated', () => {
    const noSale = FORM_D_XML.replace('<dateOfFirstSale><value>2021-03-19</value></dateOfFirstSale>', '');
    const draft = formDToRoundDraft(parseFormD(noSale), '0001715660', FILING)!;
    expect(draft.date.toISOString().slice(0, 10)).toBe('2021-04-19');
  });
});

describe('latestPerOffering', () => {
  it('collapses a Form D and its amendments onto one offering', () => {
    const filings: FilingRef[] = [
      { form: 'D', filingDate: '2017-08-29', accessionNumber: 'a1', fileNumber: '021-293647', primaryDocument: null },
      { form: 'D/A', filingDate: '2018-01-26', accessionNumber: 'a2', fileNumber: '021-293647', primaryDocument: null },
      { form: 'D', filingDate: '2021-04-19', accessionNumber: 'a3', fileNumber: '021-396288', primaryDocument: null },
      { form: '10-K', filingDate: '2022-01-01', accessionNumber: 'a4', fileNumber: '001-1', primaryDocument: null },
    ];
    const out = latestPerOffering(filings);
    expect(out.map((f) => f.accessionNumber)).toEqual(['a2', 'a3']);
  });
});

describe('findOverlappingRound', () => {
  const draft = {
    externalId: 'sec-form-d:x',
    date: new Date('2021-03-19T00:00:00Z'),
    amount: 280_821_725,
    amountUndisclosed: false,
    roundType: 'equity',
    sourceUrl: 'https://sec.gov/x',
    sourceRef: 'x',
    notes: '',
  };

  it('matches the press-reported row for the same raise', () => {
    const hit = findOverlappingRound(draft, [
      { id: 'r1', date: new Date('2021-04-28T00:00:00Z'), amount: 250_000_000, sourceUrl: null, source: 'SpaceNews', externalId: null },
    ]);
    expect(hit?.id).toBe('r1');
  });

  it('keeps a much smaller nearby round separate', () => {
    const hit = findOverlappingRound(draft, [
      { id: 'r2', date: new Date('2021-02-10T00:00:00Z'), amount: 5_000_000, sourceUrl: null, source: 'TechCrunch', externalId: null },
    ]);
    expect(hit).toBeNull();
  });

  it('keeps a same-size round outside the window separate', () => {
    const hit = findOverlappingRound(draft, [
      { id: 'r3', date: new Date('2020-01-22T00:00:00Z'), amount: 280_000_000, sourceUrl: null, source: 'Payload', externalId: null },
    ]);
    expect(hit).toBeNull();
  });

  it('will not let two filings collapse onto the same existing row', () => {
    // Two real tranches eleven weeks apart, one press-reported round. The
    // first filing claims it; the second must be recorded as its own raise.
    const rows = [
      { id: 'r9', date: new Date('2021-03-20T00:00:00Z'), amount: 250_000_000, sourceUrl: null, source: 'SpaceNews', externalId: null },
    ];
    const consumed = new Set<string>();
    const first = findOverlappingRound(draft, rows, consumed);
    expect(first?.id).toBe('r9');
    consumed.add(first!.id);
    const secondTranche = { ...draft, date: new Date('2021-06-01T00:00:00Z') };
    expect(findOverlappingRound(secondTranche, rows, consumed)).toBeNull();
  });

  it('matches a nearby round whose amount was never disclosed', () => {
    const hit = findOverlappingRound(draft, [
      { id: 'r4', date: new Date('2021-03-25T00:00:00Z'), amount: null, sourceUrl: null, source: 'Payload', externalId: null },
    ]);
    expect(hit?.id).toBe('r4');
  });
});

describe('backfill honesty', () => {
  it('does not claim reach before Form D became an electronic filing', () => {
    expect(FORM_D_ELECTRONIC_SINCE).toBe('2009-03-16');
  });
});

describe('parseFormD on a hostile document', () => {
  it('returns nulls rather than throwing on junk', () => {
    const parsed: ParsedFormD = parseFormD('<edgarSubmission></edgarSubmission>');
    expect(parsed.totalAmountSold).toBeNull();
    expect(parsed.dateOfFirstSale).toBeNull();
    expect(parsed.relatedPersons).toEqual([]);
  });
});

describe('candidatesFromFullTextSearch', () => {
  const body = JSON.stringify({
    hits: {
      hits: [
        { _source: { display_names: ['Stoke Space Technologies, Inc.  (CIK 0001861415)'] } },
        { _source: { display_names: ['Gaingels Stoke Space LLC  (CIK 0001924628)'] } },
        { _source: { display_names: ["FF Stoke Space a Series of FLORIDA FUNDERS' HIDDEN TREASURES LLC  (CIK 0002062494)"] } },
      ],
    },
  });

  it('pulls filer names and CIKs out of the search payload', () => {
    const out = candidatesFromFullTextSearch(body);
    expect(out[0]).toEqual({ cik: '0001861415', edgarName: 'Stoke Space Technologies, Inc.' });
    expect(out).toHaveLength(3);
  });

  it('leaves the SPVs for matchCompanyName to reject', () => {
    const accepted = candidatesFromFullTextSearch(body).filter(
      (c) => matchCompanyName('Stoke Space', c.edgarName) !== 'none',
    );
    expect(accepted.map((c) => c.cik)).toEqual(['0001861415']);
  });

  it('survives a non-JSON body', () => {
    expect(candidatesFromFullTextSearch('<html>503</html>')).toEqual([]);
  });
});
