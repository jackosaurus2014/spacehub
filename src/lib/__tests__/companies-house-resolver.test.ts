/**
 * @jest-environment node
 */

/**
 * The UK Companies House resolver, and the two promises the pipeline makes.
 *
 * Promise one: PRECISION. A wrong company number staples another business's
 * directors, owners and insolvency history onto our profile. Every fixture in
 * the "refuses" block below is a real register entry that a name-matching
 * resolver would have accepted.
 *
 * Promise two: PRIVACY. The officers and PSC endpoints hand over a month-and-
 * year date of birth and a service address for every named person. The parser
 * must drop both, and the test asserts on the serialised output rather than
 * the type, so a future field addition cannot quietly reintroduce them.
 *
 * Fixtures are trimmed copies of real API responses captured 2026-09-15.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {},
}));

import {
  bestNameMatch,
  chooseCandidate,
  classifySic,
  matchCompanyName,
  normalizeCompanyName,
  officeMatchesHeadquarters,
  prefilterSearchHits,
  scoreCandidate,
  ACCEPT_SCORE_THRESHOLD,
  type KnownCompany,
} from '../uk-registry/resolver';
import {
  parseCompanyProfile,
  parseCompanySearch,
  parseFilingHistory,
  parseOfficers,
  parsePsc,
  isStatusFiling,
  type CompanyProfilePayload,
} from '../uk-registry/parse';
import { msUntilReset } from '../uk-registry/client';
import { COMPANIES_HOUSE_ATTRIBUTION, companiesHouseCompanyUrl } from '../uk-registry/attribution';
import {
  diffRegistration,
  episodeStartFiling,
  isUkDomiciled,
} from '../fetchers/companies-house-fetcher';
import { MANUAL_REGISTRATIONS, manualRegistrationFor } from '../uk-registry/manual-registrations';

// ---------------------------------------------------------------------------
// Fixtures - real register entries, trimmed
// ---------------------------------------------------------------------------

function profile(over: Partial<CompanyProfilePayload>): CompanyProfilePayload {
  return {
    companyNumber: '00000000',
    companyName: 'TEST LIMITED',
    companyStatus: 'active',
    companyStatusDetail: null,
    companyType: 'ltd',
    jurisdiction: 'england-wales',
    dateOfCreation: '2015-01-01',
    dateOfCessation: null,
    sicCodes: [],
    registeredOffice: null,
    registeredOfficeLine: null,
    previousNames: [],
    hasInsolvencyHistory: false,
    hasCharges: false,
    canFile: true,
    accountsNextDue: null,
    accountsOverdue: false,
    accountsLastMadeUpTo: null,
    confirmationStatementNextDue: null,
    confirmationStatementOverdue: false,
    sourceUrl: companiesHouseCompanyUrl('00000000'),
    ...over,
  };
}

/** The real Orbex: a name no string comparison reaches. */
const ORBITAL_EXPRESS = profile({
  companyNumber: '09580714',
  companyName: 'ORBITAL EXPRESS LAUNCH LIMITED',
  companyStatus: 'administration',
  dateOfCreation: '2015-05-08',
  sicCodes: ['30300'],
  registeredOfficeLine:
    'C/O Frp Advisory Trading Limited, 2nd Floor, 110 Cannon Street, London, EC4N 6EU',
  previousNames: [
    { name: 'MOONSPIKE LIMITED', effectiveFrom: '2015-05-08', ceasedOn: '2016-01-29' },
  ],
  hasInsolvencyHistory: true,
  accountsOverdue: true,
  sourceUrl: companiesHouseCompanyUrl('09580714'),
});

/** The impostor: exact name match, active, and completely unrelated. */
const ORBEX_LTD = profile({
  companyNumber: '17198857',
  companyName: 'ORBEX LTD',
  companyStatus: 'active',
  dateOfCreation: '2026-05-05',
  sicCodes: ['47910'], // Retail sale via mail order houses or via the Internet
  registeredOfficeLine: '20 Wenlock Road, London, United Kingdom, N1 7GU',
  sourceUrl: companiesHouseCompanyUrl('17198857'),
});

const SPACE_FORGE = profile({
  companyNumber: '11646188',
  companyName: 'SPACE FORGE LIMITED',
  dateOfCreation: '2018-10-29',
  sicCodes: ['51220'],
  registeredOfficeLine: 'Unit 10, Eastgate Business Park, Wentloog Avenue, Cardiff, CF3 2EY, Wales',
  sourceUrl: companiesHouseCompanyUrl('11646188'),
});

const REACTION_ENGINES = profile({
  companyNumber: '02413577',
  companyName: 'REACTION ENGINES LIMITED',
  companyStatus: 'administration',
  dateOfCreation: '1989-08-15',
  sicCodes: ['71121'],
  registeredOfficeLine: 'Leeds',
  hasInsolvencyHistory: true,
  sourceUrl: companiesHouseCompanyUrl('02413577'),
});

const SATELLITE_VU = profile({
  companyNumber: '10163800',
  companyName: 'GLOBAL SATELLITE VU LTD',
  dateOfCreation: '2016-05-05',
  sicCodes: ['63110'],
  registeredOfficeLine: '1 New Fetter Lane, London, England, EC4A 1AN',
  sourceUrl: companiesHouseCompanyUrl('10163800'),
});

// ---------------------------------------------------------------------------
// Name normalization and matching
// ---------------------------------------------------------------------------

describe('normalizeCompanyName', () => {
  it('drops UK and international legal suffixes but never industry words', () => {
    expect(normalizeCompanyName('SPACE FORGE LIMITED')).toBe('space forge');
    expect(normalizeCompanyName('Open Cosmos Ltd.')).toBe('open cosmos');
    expect(normalizeCompanyName('Skyrora Holdings Ltd')).toBe('skyrora');
    // "Space" distinguishes companies and must survive.
    expect(normalizeCompanyName('Clyde Space Limited')).toBe('clyde space');
  });

  it('is stable across punctuation and ampersands', () => {
    expect(normalizeCompanyName('ALL.SPACE')).toBe('all space');
    expect(normalizeCompanyName('Smith & Jones Ltd')).toBe('smith and jones');
  });
});

describe('matchCompanyName', () => {
  it('accepts an exact normalized match', () => {
    expect(matchCompanyName('Space Forge', 'SPACE FORGE LIMITED')).toBe('exact');
  });

  it('accepts a generic word in front of our name', () => {
    // Satellite Vu is registered as GLOBAL SATELLITE VU LTD.
    expect(matchCompanyName('Satellite Vu', 'GLOBAL SATELLITE VU LTD')).toBe('generic-lead');
  });

  it('accepts industry words after a distinctive name', () => {
    expect(matchCompanyName('Astroscale', 'ASTROSCALE TECHNOLOGIES LTD')).toBe('industry-tail');
  });

  it('refuses a short single-token name, which collides across the register', () => {
    // "Orbex" is 5 characters and one token. On a register of five million
    // companies that is not an identity.
    expect(matchCompanyName('Orbex', 'ORBEX SOLUTIONS LIMITED')).toBe('none');
    expect(matchCompanyName('Astra', 'ASTRA SPACE LIMITED')).toBe('none');
  });

  it('refuses a name that merely shares a prefix', () => {
    expect(matchCompanyName('Orbex', 'ORBEXA PAY LTD')).toBe('none');
    expect(matchCompanyName('Open Cosmos', 'OPEN COSMOS RECRUITMENT LTD')).toBe('none');
  });

  it('never connects a trading name to an unrelated registered name', () => {
    // The whole Orbex problem in one assertion.
    expect(matchCompanyName('Orbex', 'ORBITAL EXPRESS LAUNCH LIMITED')).toBe('none');
  });
});

describe('bestNameMatch', () => {
  it('matches against former registered names as well as current ones', () => {
    const result = bestNameMatch(
      ['Moonspike'],
      ['ORBITAL EXPRESS LAUNCH LIMITED', 'MOONSPIKE LIMITED'],
    );
    expect(result.quality).toBe('exact');
    expect(result.matchedName).toBe('MOONSPIKE LIMITED');
  });
});

// ---------------------------------------------------------------------------
// SIC classification
// ---------------------------------------------------------------------------

describe('classifySic', () => {
  it('recognises the space-specific codes', () => {
    expect(classifySic(['30300'])).toBe('strong'); // air and spacecraft manufacture
    expect(classifySic(['51220'])).toBe('strong'); // space transport
    expect(classifySic(['61300'])).toBe('strong'); // satellite telecommunications
  });

  it('accepts the wide spread of codes real UK space companies actually use', () => {
    // Calibrated against ten real companies; there is no narrow "space SIC".
    for (const code of ['74909', '71129', '71122', '63110', '27900', '71121', '26110']) {
      expect(classifySic([code])).toBe('plausible');
    }
  });

  it('rejects codes no reading of a space company reaches', () => {
    // This single verdict is what keeps ORBEX LTD out of the dataset.
    expect(classifySic(['47910'])).toBe('unrelated');
    expect(classifySic(['56101'])).toBe('unrelated'); // licensed restaurants
    expect(classifySic(['68209'])).toBe('unrelated'); // letting of own real estate
  });

  it('treats holding-company codes as neither evidence nor disqualification', () => {
    expect(classifySic(['64209'])).toBe('neutral');
    expect(classifySic(['70100'])).toBe('neutral');
  });

  it('says nothing when the register lists no codes', () => {
    expect(classifySic([])).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// Scoring: the precision guard
// ---------------------------------------------------------------------------

describe('scoreCandidate', () => {
  const orbex: KnownCompany = {
    name: 'Orbex',
    legalName: 'Orbex Space Ltd',
    headquarters: 'Forres, Scotland',
    foundedYear: 2015,
    status: 'defunct',
  };

  it('DISQUALIFIES the impostor that an exact name match would have accepted', () => {
    const scored = scoreCandidate(orbex, ORBEX_LTD);
    expect(scored.disqualifiedBecause).toMatch(/47910/);
    expect(scored.disqualifiedBecause).toMatch(/unrelated to any space activity/);
  });

  it('would still refuse the impostor on score alone if the SIC gate were absent', () => {
    // Belt and braces: strip the disqualifying code and the date evidence
    // alone keeps it under the bar. A 2026 incorporation cannot be a company
    // we record as founded in 2015.
    const scored = scoreCandidate(orbex, profile({ ...ORBEX_LTD, sicCodes: [] }));
    expect(scored.disqualifiedBecause).toBeNull();
    expect(scored.score).toBeLessThan(ACCEPT_SCORE_THRESHOLD);
    expect(scored.evidence.join(' ')).toMatch(/counts against/);
  });

  it('never disqualifies a company merely for being insolvent', () => {
    // Reaction Engines has been on the register since 1989 and is in
    // administration. That is a fact worth publishing, not a reason to drop it.
    const known: KnownCompany = {
      name: 'Reaction Engines',
      headquarters: 'Oxfordshire, England',
      foundedYear: 1989,
      status: 'active',
    };
    const scored = scoreCandidate(known, REACTION_ENGINES);
    expect(scored.disqualifiedBecause).toBeNull();
    expect(scored.score).toBeGreaterThanOrEqual(ACCEPT_SCORE_THRESHOLD);
    expect(scored.evidence.join(' ')).toMatch(/administration/);
  });

  it('accepts a real company on name plus corroboration, not name alone', () => {
    const known: KnownCompany = {
      name: 'Space Forge',
      legalName: 'Space Forge Ltd',
      headquarters: 'Cardiff, Wales',
      foundedYear: 2018,
      status: 'active',
    };
    const scored = scoreCandidate(known, SPACE_FORGE);
    expect(scored.disqualifiedBecause).toBeNull();
    expect(scored.nameQuality).toBe('exact');
    expect(scored.score).toBeGreaterThanOrEqual(ACCEPT_SCORE_THRESHOLD);
    // Corroborated by more than the name.
    expect(scored.evidence.join(' ')).toMatch(/matching our founded year/);
    expect(scored.evidence.join(' ')).toMatch(/registered office/);
  });

  it('records every component that moved the score, for the audit trail', () => {
    const known: KnownCompany = {
      name: 'Satellite Vu',
      headquarters: 'London, UK',
      foundedYear: 2016,
      status: 'active',
    };
    const scored = scoreCandidate(known, SATELLITE_VU);
    expect(scored.nameQuality).toBe('generic-lead');
    expect(scored.matchedName).toBe('GLOBAL SATELLITE VU LTD');
    expect(scored.evidence.length).toBeGreaterThan(2);
  });
});

describe('renamed companies', () => {
  // Pulsar Fusion is on the register as PULSAR AEROSPACE LIMITED, renamed
  // from PULSAR FUSION LTD on 2025-08-20. Companies House advanced search for
  // "pulsar fusion" returns NOTHING, because the search index carries only the
  // current name. Only the full profile carries the former one.
  const PULSAR = profile({
    companyNumber: '11914684',
    companyName: 'PULSAR AEROSPACE LIMITED',
    dateOfCreation: '2019-03-29',
    sicCodes: ['72190'],
    registeredOfficeLine: 'Unit 21 Peverel Drive, Bletchley, England, MK1 1NN',
    previousNames: [
      { name: 'PULSAR FUSION LTD', effectiveFrom: '2019-03-29', ceasedOn: '2025-08-20' },
    ],
  });

  const known: KnownCompany = {
    name: 'Pulsar Fusion',
    legalName: 'Pulsar Fusion Ltd.',
    headquarters: 'Bletchley, United Kingdom',
    foundedYear: 2011,
    status: 'active',
  };

  it('is invisible to the cheap current-name filter', () => {
    const hits = parseCompanySearch({
      items: [{ company_number: '11914684', title: 'PULSAR AEROSPACE LIMITED' }],
    });
    expect(prefilterSearchHits(known, hits)).toHaveLength(0);
  });

  it('resolves once the former name is read from the full profile', () => {
    const scored = scoreCandidate(known, PULSAR);
    expect(scored.matchedName).toBe('PULSAR FUSION LTD');
    expect(scored.evidence.join(' ')).toMatch(/FORMER registered name/);
    expect(scored.score).toBeGreaterThanOrEqual(ACCEPT_SCORE_THRESHOLD);
  });

  it('still clears the bar despite an incorporation date 8 years off our record', () => {
    // Our founded year (2011) is when the founder started the venture; the
    // company was not incorporated until 2019. The date penalty applies and
    // the match survives it on the strength of the former name, the SIC code
    // and a registered office in the town we already recorded.
    const scored = scoreCandidate(known, PULSAR);
    expect(scored.evidence.join(' ')).toMatch(/counts against/);
    expect(scored.evidence.join(' ')).toMatch(/Bletchley/);
  });
});

describe('chooseCandidate', () => {
  const orbex: KnownCompany = {
    name: 'Orbex',
    legalName: 'Orbex Space Ltd',
    headquarters: 'Forres, Scotland',
    foundedYear: 2015,
    status: 'defunct',
  };

  it('refuses the entire Orbex candidate set rather than guessing', () => {
    // These are the real top hits for "Orbex". None of them is Orbex.
    const outcome = chooseCandidate(orbex, [
      ORBEX_LTD,
      profile({
        companyNumber: '04219670',
        companyName: 'ORBEX SOLUTIONS LIMITED',
        dateOfCreation: '2001-05-18',
        sicCodes: ['62020'],
      }),
      profile({
        companyNumber: '16770822',
        companyName: 'ORBEXA PAY LTD',
        dateOfCreation: '2025-10-08',
        sicCodes: ['64999'],
      }),
    ]);
    expect(outcome.accepted).toBeNull();
    expect(outcome.refusedBecause).toBeTruthy();
    // And it never even sees the real company, because no name search reaches it.
    expect(outcome.considered.some((c) => c.companyNumber === '09580714')).toBe(false);
  });

  it('refuses when two candidates are too close to tell apart', () => {
    const known: KnownCompany = {
      name: 'Space Forge',
      headquarters: 'Cardiff, Wales',
      foundedYear: 2018,
      status: 'active',
    };
    const twin = profile({
      ...SPACE_FORGE,
      companyNumber: '99999999',
      companyName: 'SPACE FORGE LTD',
    });
    const outcome = chooseCandidate(known, [SPACE_FORGE, twin]);
    expect(outcome.accepted).toBeNull();
    expect(outcome.refusedBecause).toMatch(/ambiguous/);
  });

  it('says so plainly when the search returned nothing', () => {
    const outcome = chooseCandidate(orbex, []);
    expect(outcome.accepted).toBeNull();
    expect(outcome.refusedBecause).toMatch(/no candidates/);
  });
});

describe('prefilterSearchHits', () => {
  it('drops hits that could never be accepted, before they cost a request', () => {
    const known: KnownCompany = { name: 'Space Forge' };
    const hits = parseCompanySearch({
      items: [
        { company_number: '11646188', title: 'SPACE FORGE LIMITED' },
        { company_number: '16770822', title: 'ORBEXA PAY LTD' },
        { company_number: '00000001', title: 'FORGE SPACE HOLDINGS LTD' },
      ],
    });
    const kept = prefilterSearchHits(known, hits);
    expect(kept.map((h) => h.companyNumber)).toEqual(['11646188']);
  });
});

describe('officeMatchesHeadquarters', () => {
  it('matches on a shared place name', () => {
    expect(officeMatchesHeadquarters('Cardiff, Wales', 'Unit 10, Cardiff, CF3 2EY')).toBe(true);
  });

  it('is not fooled by the boilerplate every UK address shares', () => {
    expect(
      officeMatchesHeadquarters('Forres, Scotland', '1 High Street, London, United Kingdom'),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Parsing, and the privacy promise
// ---------------------------------------------------------------------------

const OFFICERS_FIXTURE = {
  items: [
    {
      address: {
        address_line_1: 'Eastgate Business Park',
        locality: 'Cardiff',
        postal_code: 'CF3 2EY',
        premises: 'Unit 10',
      },
      appointed_on: '2018-10-29',
      country_of_residence: 'United Kingdom',
      date_of_birth: { month: 6, year: 1987 },
      links: { self: '/company/11646188/appointments/31E1sJ4hNfM1E0bhBV4hn-KYMt8' },
      name: 'BACON, Andrew',
      nationality: 'British',
      officer_role: 'director',
    },
    {
      appointed_on: '2019-02-01',
      resigned_on: '2023-06-30',
      date_of_birth: { month: 4, year: 1989 },
      links: { self: '/company/11646188/appointments/W9ELPaEfc7Cwj8cbQY1ZP3BBw5o' },
      name: 'GORDHAN, Sanjeev Uday',
      officer_role: 'secretary',
    },
  ],
};

const PSC_FIXTURE = {
  items: [
    {
      notified_on: '2018-10-29',
      ceased_on: '2024-07-11',
      country_of_residence: 'England',
      date_of_birth: { month: 11, year: 1992 },
      name: 'Mr Joshua Western',
      links: {
        self: '/company/11646188/persons-with-significant-control/individual/8Xle50cVSwvB8h6SkHUOlAd2tqo',
      },
      nationality: 'British',
      ceased: true,
      kind: 'individual-person-with-significant-control',
      address: { address_line_1: 'Eastgate Business Park', postal_code: 'CF3 2EY' },
      natures_of_control: ['ownership-of-shares-25-to-50-percent'],
    },
  ],
};

describe('officer and PSC parsing', () => {
  it('keeps identity and role', () => {
    const officers = parseOfficers(OFFICERS_FIXTURE, '11646188');
    expect(officers).toHaveLength(2);
    expect(officers[0].name).toBe('BACON, Andrew');
    expect(officers[0].officerRole).toBe('director');
    expect(officers[0].appointmentId).toBe('31E1sJ4hNfM1E0bhBV4hn-KYMt8');
    expect(officers[0].resignedOn).toBeNull();
    expect(officers[1].resignedOn).toBe('2023-06-30');
  });

  it('DROPS date of birth and service address - the privacy promise', () => {
    // Asserted on the serialised output, not the type, so adding a field
    // later cannot quietly reintroduce personal data the OGL does not cover.
    const serialised = JSON.stringify(parseOfficers(OFFICERS_FIXTURE, '11646188'));
    expect(serialised).not.toMatch(/1987/);
    expect(serialised).not.toMatch(/date_of_birth|dateOfBirth/i);
    expect(serialised).not.toMatch(/Eastgate/);
    expect(serialised).not.toMatch(/CF3 2EY/);
  });

  it('keeps PSC control facts and drops PSC personal data', () => {
    const pscs = parsePsc(PSC_FIXTURE, '11646188');
    expect(pscs).toHaveLength(1);
    expect(pscs[0].naturesOfControl).toEqual(['ownership-of-shares-25-to-50-percent']);
    expect(pscs[0].ceased).toBe(true);
    const serialised = JSON.stringify(pscs);
    expect(serialised).not.toMatch(/1992/);
    expect(serialised).not.toMatch(/Eastgate/);
  });
});

describe('parseCompanyProfile', () => {
  it('reads status, dates, codes, former names and filing punctuality', () => {
    const parsed = parseCompanyProfile({
      company_number: '09580714',
      company_name: 'ORBITAL EXPRESS LAUNCH LIMITED',
      company_status: 'administration',
      type: 'ltd',
      jurisdiction: 'england-wales',
      date_of_creation: '2015-05-08',
      sic_codes: ['30300'],
      has_insolvency_history: true,
      registered_office_address: {
        address_line_1: 'C/O Frp Advisory Trading Limited',
        locality: 'London',
        postal_code: 'EC4N 6EU',
      },
      previous_company_names: [
        { name: 'MOONSPIKE LIMITED', effective_from: '2015-05-08', ceased_on: '2016-01-29' },
      ],
      accounts: { next_accounts: { due_on: '2025-12-31', overdue: true } },
      confirmation_statement: { next_due: '2026-01-27', overdue: true },
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.companyStatus).toBe('administration');
    expect(parsed!.previousNames[0].name).toBe('MOONSPIKE LIMITED');
    expect(parsed!.accountsOverdue).toBe(true);
    expect(parsed!.confirmationStatementOverdue).toBe(true);
    expect(parsed!.registeredOfficeLine).toMatch(/Cannon|Frp Advisory/);
    expect(parsed!.sourceUrl).toContain('09580714');
  });

  it('returns null rather than a half-built row when the payload is not a company', () => {
    expect(parseCompanyProfile({ errors: [{ error: 'company-profile-not-found' }] })).toBeNull();
    expect(parseCompanyProfile(null)).toBeNull();
  });
});

describe('filing history', () => {
  const FILINGS = {
    items: [
      {
        transaction_id: 'MzUyNzUzNjg0M2FkaXF6a2N4',
        type: 'AM02',
        date: '2026-07-02',
        category: 'insolvency',
        subcategory: 'administration',
        description: 'liquidation-in-administration-statement-of-affairs-with-form-attached',
        paper_filed: true,
      },
      {
        transaction_id: 'abc',
        type: 'AA',
        date: '2024-09-30',
        category: 'accounts',
        description: 'accounts-with-accounts-type-group',
      },
    ],
  };

  it('flags the filings that date a corporate-status change', () => {
    const filings = parseFilingHistory(FILINGS, '09580714');
    expect(filings).toHaveLength(2);
    expect(isStatusFiling(filings[0])).toBe(true);
    expect(isStatusFiling(filings[1])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status-change detection
// ---------------------------------------------------------------------------

describe('episodeStartFiling', () => {
  // Orbex's real administration chain, newest first.
  const ORBEX_CHAIN = parseFilingHistory(
    {
      items: [
        { transaction_id: 'am02', type: 'AM02', date: '2026-07-02', category: 'insolvency' },
        { transaction_id: 'am06', type: 'AM06', date: '2026-05-07', category: 'insolvency' },
        { transaction_id: 'am03', type: 'AM03', date: '2026-04-24', category: 'insolvency' },
        { transaction_id: 'am01', type: 'AM01', date: '2026-03-06', category: 'insolvency' },
      ],
    },
    '09580714',
  );

  it('dates the status by the filing that STARTED the episode', () => {
    // Not the statement of affairs in July - the administrator's appointment
    // in March. Four months matters on exactly this fact.
    expect(episodeStartFiling(ORBEX_CHAIN)?.transactionId).toBe('am01');
  });

  it('does not reach back to an unrelated earlier insolvency', () => {
    const withOldEpisode = parseFilingHistory(
      {
        items: [
          { transaction_id: 'new', type: 'AM01', date: '2026-03-06', category: 'insolvency' },
          { transaction_id: 'ancient', type: 'LIQ', date: '2011-01-04', category: 'insolvency' },
        ],
      },
      '09580714',
    );
    expect(episodeStartFiling(withOldEpisode)?.transactionId).toBe('new');
  });

  it('dates a strike-off by the notice that ENDED it, not the one that opened it', () => {
    // Rebellion Defence: the gazette notice of intent ran on 2024-06-25 and
    // the company was dissolved on 2024-09-10. It was alive in between, so
    // the episode-start rule would have been eleven weeks early.
    const gazette = parseFilingHistory(
      {
        items: [
          {
            transaction_id: 'final',
            date: '2024-09-10',
            category: 'gazette',
            description: 'gazette-dissolved-voluntary',
          },
          {
            transaction_id: 'notice',
            date: '2024-06-25',
            category: 'gazette',
            description: 'gazette-notice-voluntary',
          },
        ],
      },
      '11963872',
    );
    expect(episodeStartFiling(gazette)?.transactionId).toBe('final');
  });

  it('is undefined when the register holds no status filing', () => {
    expect(episodeStartFiling([])).toBeUndefined();
  });
});

describe('diffRegistration', () => {
  const statusFilings = parseFilingHistory(
    {
      items: [
        {
          transaction_id: 'tx-am01',
          type: 'AM01',
          date: '2026-03-06',
          category: 'insolvency',
          description: 'appoint-an-administrator',
        },
      ],
    },
    '09580714',
  );

  it('records a first sighting as a BASELINE, never as a change', () => {
    const drafts = diffRegistration(null, ORBITAL_EXPRESS, statusFilings);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].field).toBe('company_status');
    expect(drafts[0].isBaseline).toBe(true);
    expect(drafts[0].previousValue).toBeNull();
    expect(drafts[0].newValue).toBe('administration');
  });

  it('dates a status change by the register filing that evidences it', () => {
    const drafts = diffRegistration(
      {
        companyStatus: 'active',
        registeredName: 'ORBITAL EXPRESS LAUNCH LIMITED',
        registeredOffice: ORBITAL_EXPRESS.registeredOfficeLine,
        accountsOverdue: true,
      },
      ORBITAL_EXPRESS,
      statusFilings,
    );
    const statusChange = drafts.find((d) => d.field === 'company_status');
    expect(statusChange).toBeDefined();
    expect(statusChange!.isBaseline).toBe(false);
    expect(statusChange!.previousValue).toBe('active');
    expect(statusChange!.newValue).toBe('administration');
    // The date comes from the register, not from when we happened to look.
    expect(statusChange!.effectiveOn?.toISOString().slice(0, 10)).toBe('2026-03-06');
    expect(statusChange!.filingTransactionId).toBe('tx-am01');
  });

  it('notices a rename and an office move without claiming a filing date', () => {
    const drafts = diffRegistration(
      {
        companyStatus: 'administration',
        registeredName: 'MOONSPIKE LIMITED',
        registeredOffice: 'Somewhere else',
        accountsOverdue: true,
      },
      ORBITAL_EXPRESS,
      statusFilings,
    );
    const rename = drafts.find((d) => d.field === 'company_name');
    const move = drafts.find((d) => d.field === 'registered_office');
    expect(rename?.newValue).toBe('ORBITAL EXPRESS LAUNCH LIMITED');
    expect(rename?.effectiveOn).toBeNull();
    expect(move?.effectiveOn).toBeNull();
  });

  it('emits nothing when the register has not moved', () => {
    const drafts = diffRegistration(
      {
        companyStatus: 'administration',
        registeredName: 'ORBITAL EXPRESS LAUNCH LIMITED',
        registeredOffice: ORBITAL_EXPRESS.registeredOfficeLine,
        accountsOverdue: true,
      },
      ORBITAL_EXPRESS,
      statusFilings,
    );
    expect(drafts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Scope gate
// ---------------------------------------------------------------------------

describe('isUkDomiciled', () => {
  it('accepts the spellings our own roster actually uses', () => {
    for (const value of ['GB', 'gb', 'United Kingdom', 'Scotland', ' UK ']) {
      expect(isUkDomiciled(value)).toBe(true);
    }
  });

  it('keeps the two Cambridges out', () => {
    // A headquarters keyword sweep for UK place names pulls in exactEarth
    // (Cambridge, ONTARIO) and Draper Laboratory (Cambridge, MASSACHUSETTS).
    // Neither has a UK registration, and searching for them is how false
    // matches get made. The gate is the country field, not the address.
    expect(isUkDomiciled('Canada')).toBe(false);
    expect(isUkDomiciled('United States')).toBe(false);
    expect(isUkDomiciled('SE')).toBe(false);
    expect(isUkDomiciled(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rate-limit arithmetic
// ---------------------------------------------------------------------------

describe('msUntilReset', () => {
  it('waits until the window the header names', () => {
    const now = 1_700_000_000_000;
    expect(msUntilReset(String(now / 1000 + 120), now)).toBe(121_000);
  });

  it('falls back to a full minute rather than guessing short', () => {
    // Guessing short is what gets an API key suspended.
    expect(msUntilReset(null)).toBe(60_000);
    expect(msUntilReset('not-a-number')).toBe(60_000);
  });

  it('never returns a negative wait for a window that already reset', () => {
    const now = 1_700_000_000_000;
    expect(msUntilReset(String(now / 1000 - 600), now)).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// Licence and manual pins
// ---------------------------------------------------------------------------

describe('licence attribution', () => {
  it('carries the exact wording the Open Government Licence specifies', () => {
    // The OGL grants reuse ON CONDITION of acknowledgement, and the rights end
    // automatically if the condition is not met. The string is load-bearing.
    expect(COMPANIES_HOUSE_ATTRIBUTION).toBe(
      'Contains public sector information licensed under the Open Government Licence v3.0.',
    );
  });
});

describe('manual registrations', () => {
  it('pins Orbex, which the resolver is right to refuse', () => {
    const pin = manualRegistrationFor('orbex');
    expect(pin).not.toBeNull();
    expect(pin!.companyNumber).toBe('09580714');
    expect(pin!.registeredName).toBe('ORBITAL EXPRESS LAUNCH LIMITED');
  });

  it('requires evidence and openable sources on every pin', () => {
    // A pin without evidence is a guess with better posture.
    for (const pin of MANUAL_REGISTRATIONS) {
      expect(pin.evidence.length).toBeGreaterThan(80);
      expect(pin.sources.length).toBeGreaterThan(0);
      for (const source of pin.sources) expect(source).toMatch(/^https:\/\//);
      expect(pin.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
