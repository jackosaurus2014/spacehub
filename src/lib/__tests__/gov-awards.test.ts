/**
 * @jest-environment node
 */

/**
 * Federal awards — the guards that keep the attribution honest.
 *
 * The whole product risk of this dataset sits in one place: a federal award
 * attributed to the wrong company. That is a number an investor acts on and we
 * cannot defend, and unlike a missing award it is invisible until somebody
 * checks. So the matcher is pinned here case by case, against the real
 * recipient strings USAspending returns, and the arithmetic that turns those
 * rows into published figures is pinned beside it.
 *
 * Every case below is a decision the pipeline actually makes. None of them is
 * hypothetical: the recipient names are verbatim from the live API.
 */

import fs from 'fs';
import path from 'path';

import {
  ACCEPTED_MATCH_QUALITIES,
  isSearchableCompanyName,
  matchRecipientName,
  normalizeRecipientName,
  normalizeUei,
  resolveRecipient,
  type CompanyForMatching,
} from '../gov-awards/match';
import {
  concentrationBand,
  countable,
  hhi,
  inWindow,
  isSpaceCoded,
  shortAgency,
  spaceCodedOnly,
  sumAmount,
  topNShare,
  totalsByAgency,
  totalsByCompany,
  type AwardRow,
} from '../gov-awards/aggregate';
import { getRelease, RESEARCH_RELEASES } from '../research-releases';
import { AWARD_GROUPS, awardUrl, parseAwardResult, searchTermsFor } from '../fetchers/usaspending-awards-fetcher';

// ---------------------------------------------------------------------------
// 1. Normalization
// ---------------------------------------------------------------------------

describe('recipient-name normalization', () => {
  it('strips corporate form without touching identity', () => {
    expect(normalizeRecipientName('ROCKET LAB USA INC')).toBe('rocket lab');
    expect(normalizeRecipientName('PLANET LABS FEDERAL, INC.')).toBe('planet labs federal');
    expect(normalizeRecipientName('ASTRANIS SPACE TECHNOLOGIES CORP')).toBe(
      'astranis space technologies'
    );
    expect(normalizeRecipientName('The Boeing Company')).toBe('boeing');
  });

  it('keeps words that DISTINGUISH companies', () => {
    // "Space" and "Technologies" are identity here, not corporate form.
    expect(normalizeRecipientName('Astra Space')).toBe('astra space');
    expect(normalizeRecipientName('Sierra Space')).toBe('sierra space');
  });

  it('never collapses a name to nothing', () => {
    expect(normalizeRecipientName('Inc')).toBe('inc');
    expect(normalizeRecipientName('')).toBe('');
  });

  it('normalizes a UEI to the alphanumeric form the government uses', () => {
    expect(normalizeUei('l8j4jmap3496')).toBe('L8J4JMAP3496');
    expect(normalizeUei(' L8J4-JMAP 3496 ')).toBe('L8J4JMAP3496');
    expect(normalizeUei(null)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2. The matcher — the cases that matter
// ---------------------------------------------------------------------------

describe('matching a company to a government recipient', () => {
  it('accepts an exact match once corporate form is stripped', () => {
    expect(matchRecipientName('Rocket Lab', 'ROCKET LAB USA INC')).toBe('exact');
    expect(matchRecipientName('Astrobotic Technology', 'ASTROBOTIC TECHNOLOGY INC')).toBe('exact');
  });

  it('accepts a federal arm whose extra words are all generic', () => {
    // Verified live: Planet's federal subsidiary holds the NASA CSDA orders.
    expect(matchRecipientName('Planet Labs', 'PLANET LABS FEDERAL, INC.')).toBe('federal-arm');
    // Verified live: Rocket Lab's national-security arm holds USSF orders.
    expect(matchRecipientName('Rocket Lab', 'ROCKET LAB NATIONAL SECURITY LLC')).toBe(
      'federal-arm'
    );
    expect(matchRecipientName('Astranis', 'ASTRANIS SPACE TECHNOLOGIES CORP')).toBe('federal-arm');
  });

  it('REFUSES a namesake that is a different legal person', () => {
    // Verified live: a real NASA grantee, and not the company.
    expect(matchRecipientName('Astrobotic', 'ASTROBOTIC FOUNDATION')).toBe('none');
    expect(matchRecipientName('Astrobotic Technology', 'ASTROBOTIC FOUNDATION')).toBe('none');
    expect(matchRecipientName('Maxar', 'MAXAR INSTITUTE')).toBe('none');
    expect(matchRecipientName('Blue Origin', 'BLUE ORIGIN FOUNDATION')).toBe('none');
  });

  it('REFUSES a prefix that is not a token boundary', () => {
    expect(matchRecipientName('Astro', 'ASTROSCALE US INC')).toBe('none');
    expect(matchRecipientName('Planet', 'PLANETARY RESOURCES INC')).toBe('none');
    expect(matchRecipientName('Space', 'SPACEX')).toBe('none');
  });

  it('REFUSES a tail word that carries its own meaning', () => {
    // "Medical" is not generic corporate filler; this is a different business.
    expect(matchRecipientName('Momentus Space', 'MOMENTUS SPACE MEDICAL SUPPLY')).toBe('none');
    expect(matchRecipientName('Sierra Space', 'SIERRA SPACE RANCH LLC')).toBe('none');
  });

  it('REFUSES a name too generic to prefix-match on', () => {
    expect(isSearchableCompanyName('Astra')).toBe(false);
    expect(isSearchableCompanyName('Vast')).toBe(false);
    expect(matchRecipientName('Astra', 'ASTRA FEDERAL SERVICES LLC')).toBe('none');
    expect(matchRecipientName('Vast', 'VAST GOVERNMENT SOLUTIONS INC')).toBe('none');
    // ...but the same company still matches EXACTLY, which cannot collide.
    expect(matchRecipientName('Astra Space', 'ASTRA SPACE INC')).toBe('exact');
  });

  it('treats a two-token or long single-token name as distinctive', () => {
    expect(isSearchableCompanyName('Planet Labs')).toBe(true);
    expect(isSearchableCompanyName('Astranis')).toBe(true); // 8 chars
    expect(isSearchableCompanyName('Rocket Lab')).toBe(true);
  });

  it('offers exactly three accepted qualities and no fuzzy tier', () => {
    expect(ACCEPTED_MATCH_QUALITIES).toEqual(['uei', 'exact', 'federal-arm']);
  });
});

// ---------------------------------------------------------------------------
// 3. Roster-level resolution: identity first, ambiguity refused
// ---------------------------------------------------------------------------

const ROSTER: CompanyForMatching[] = [
  { id: 'c-rocket', slug: 'rocket-lab', name: 'Rocket Lab', samUei: 'ROCKETUEI123' },
  { id: 'c-planet', slug: 'planet-labs', name: 'Planet Labs', samUei: null },
  { id: 'c-astranis', slug: 'astranis', name: 'Astranis', samUei: 'L8J4JMAP3496' },
  { id: 'c-orbital-1', slug: 'orbital-systems-a', name: 'Orbital Frontier', samUei: null },
  { id: 'c-orbital-2', slug: 'orbital-systems-b', name: 'Orbital Frontier', samUei: null },
];

describe('resolving a recipient against the whole roster', () => {
  it('prefers a Unique Entity ID, which is an identity rather than a guess', () => {
    const match = resolveRecipient(
      { recipientName: 'A NAME WE WOULD NEVER MATCH LLC', recipientUei: 'l8j4jmap3496' },
      ROSTER
    );
    expect(match).toEqual({
      companyId: 'c-astranis',
      companySlug: 'astranis',
      matchedName: 'Astranis',
      quality: 'uei',
    });
  });

  it('falls back to the name when no UEI is held', () => {
    const match = resolveRecipient(
      { recipientName: 'PLANET LABS FEDERAL, INC.', recipientUei: 'UNKNOWNUEI99' },
      ROSTER
    );
    expect(match?.companyId).toBe('c-planet');
    expect(match?.quality).toBe('federal-arm');
  });

  it('prefers an exact name match over a federal-arm match', () => {
    const match = resolveRecipient({ recipientName: 'ROCKET LAB USA INC' }, ROSTER);
    expect(match?.companyId).toBe('c-rocket');
    expect(match?.quality).toBe('exact');
  });

  it('REFUSES a recipient that two different companies would claim', () => {
    // Two profiles share a name; attributing to whichever the loop reached
    // first is not attribution.
    expect(resolveRecipient({ recipientName: 'ORBITAL FRONTIER LLC' }, ROSTER)).toBeNull();
  });

  it('returns null rather than a doubtful match', () => {
    expect(resolveRecipient({ recipientName: 'LOCKHEED MARTIN CORPORATION' }, ROSTER)).toBeNull();
    expect(resolveRecipient({ recipientName: 'ASTROBOTIC FOUNDATION' }, ROSTER)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Parsing what the API actually returns
// ---------------------------------------------------------------------------

describe('parsing a USAspending award record', () => {
  const contractSpec = AWARD_GROUPS.find((g) => g.group === 'contract')!;
  const idvSpec = AWARD_GROUPS.find((g) => g.group === 'idv')!;

  // Verbatim shape of a live response row (Rocket Lab / NASA, read 2026-09-15).
  const raw = {
    'Award ID': '80KSC023FA107',
    'Recipient Name': 'ROCKET LAB USA INC',
    'Recipient UEI': 'ROCKETUEI123',
    'Award Amount': 51598522.0,
    'Total Outlays': null,
    'Awarding Agency': 'National Aeronautics and Space Administration',
    'Awarding Sub Agency': 'National Aeronautics and Space Administration',
    'Contract Award Type': 'DELIVERY ORDER',
    'Start Date': '2023-03-29',
    'End Date': '2032-01-27',
    'Base Obligation Date': '2023-03-29',
    generated_internal_id: 'CONT_AWD_80KSC023FA107_8000_80KSC022DA107_8000',
    recipient_id: '9669604f-4d27-3568-c3df-ff74486a93ea-C',
  };

  it('keeps the government record intact and links back to it', () => {
    const parsed = parseAwardResult(raw, contractSpec)!;
    expect(parsed.recipientName).toBe('ROCKET LAB USA INC');
    expect(parsed.amount).toBe(51598522);
    expect(parsed.awardType).toBe('DELIVERY ORDER');
    expect(parsed.actionDate?.toISOString()).toBe('2023-03-29T00:00:00.000Z');
    expect(parsed.sourceUrl).toBe(
      awardUrl('CONT_AWD_80KSC023FA107_8000_80KSC022DA107_8000')
    );
    expect(parsed.sourceUrl.startsWith('https://www.usaspending.gov/award/')).toBe(true);
  });

  it('refuses a record with no stable id or no recipient', () => {
    expect(parseAwardResult({ ...raw, generated_internal_id: null }, contractSpec)).toBeNull();
    expect(parseAwardResult({ ...raw, 'Recipient Name': '  ' }, contractSpec)).toBeNull();
  });

  it('never invents a date when the record has none', () => {
    const parsed = parseAwardResult(
      { ...raw, 'Base Obligation Date': null, 'Start Date': null, 'End Date': 'unknown' },
      contractSpec
    )!;
    expect(parsed.actionDate).toBeNull();
    expect(parsed.startDate).toBeNull();
    expect(parsed.endDate).toBeNull();
  });

  it('marks indefinite-delivery vehicles as not counting toward dollars', () => {
    expect(idvSpec.countsTowardTotals).toBe(false);
    const parsed = parseAwardResult(raw, idvSpec)!;
    expect(parsed.countsTowardTotals).toBe(false);
  });

  it('asks only for fields each award mapping accepts', () => {
    // The IDV mapping has no "End Date" — it exposes "Last Date to Order".
    // Asking for a field a mapping does not define is a 400, which is how this
    // pipeline would silently stop returning IDVs.
    expect(idvSpec.fields).not.toContain('End Date');
    expect(idvSpec.fields).toContain('Last Date to Order');
    expect(AWARD_GROUPS.find((g) => g.group === 'assistance')!.fields).toContain('Award Type');
    expect(contractSpec.fields).toContain('Contract Award Type');
    for (const group of AWARD_GROUPS) {
      expect(group.fields).toContain('generated_internal_id');
      expect(group.fields).toContain('Recipient Name');
      expect(group.fields).toContain('Award Amount');
    }
  });

  it('spends requests only on terms that can produce a safe match', () => {
    expect(searchTermsFor({ id: 'x', slug: 'x', name: 'Astra', samUei: null })).toEqual([]);
    expect(searchTermsFor({ id: 'x', slug: 'x', name: 'Astra', samUei: 'ABC123DEF456' })).toEqual([
      'ABC123DEF456',
    ]);
    expect(
      searchTermsFor({ id: 'x', slug: 'x', name: 'Planet Labs', legalName: 'Planet Labs PBC' })
    ).toEqual(['Planet Labs', 'Planet Labs PBC']);
  });
});

// ---------------------------------------------------------------------------
// 5. The arithmetic the release publishes
// ---------------------------------------------------------------------------

function award(partial: Partial<AwardRow> & { generatedInternalId: string }): AwardRow {
  return {
    awardIdPiid: partial.generatedInternalId,
    awardGroup: 'contract',
    awardType: 'DEFINITIVE CONTRACT',
    countsTowardTotals: true,
    companyId: 'c-1',
    companySlug: 'company-one',
    companyName: 'Company One',
    recipientName: 'COMPANY ONE INC',
    matchQuality: 'exact',
    amount: 100,
    awardingAgency: 'National Aeronautics and Space Administration',
    awardingSubAgency: 'National Aeronautics and Space Administration',
    actionDate: new Date('2026-02-01T00:00:00Z'),
    startDate: new Date('2026-02-01T00:00:00Z'),
    endDate: null,
    naicsCode: '336414',
    pscCode: '1810',
    cfdaProgramTitle: null,
    description: null,
    sourceUrl: 'https://www.usaspending.gov/award/x',
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// 4b. Space work vs everything else — the distinction the release turns on
// ---------------------------------------------------------------------------

describe('telling space work apart from the rest of a prime’s federal book', () => {
  it('accepts the product/service codes whose official name says SPACE', () => {
    // Every code here was read from the live API with its own description.
    expect(isSpaceCoded({ pscCode: '1810' })).toBe(true); // SPACE VEHICLES
    expect(isSpaceCoded({ pscCode: '1820' })).toBe(true); // SPACE VEHICLE COMPONENTS
    expect(isSpaceCoded({ pscCode: '1555' })).toBe(true); // SPACE VEHICLES
    expect(isSpaceCoded({ pscCode: 'AR62' })).toBe(true); // R&D- SPACE: STATION
    expect(isSpaceCoded({ pscCode: 'AR11' })).toBe(true); // SPACE R&D SERVICES
    expect(isSpaceCoded({ pscCode: 'V126' })).toBe(true); // SPACE TRANSPORTATION/LAUNCH
  });

  it('accepts the two industry codes that name space or satellites outright', () => {
    expect(isSpaceCoded({ naicsCode: '927110' })).toBe(true); // SPACE RESEARCH AND TECHNOLOGY
    expect(isSpaceCoded({ naicsCode: '517410' })).toBe(true); // SATELLITE TELECOMMUNICATIONS
  });

  it('REFUSES the prime work that is not space, however large', () => {
    expect(isSpaceCoded({ pscCode: '1510', naicsCode: '336411' })).toBe(false); // AIRCRAFT, FIXED WING
    expect(isSpaceCoded({ pscCode: '1410', naicsCode: '336414' })).toBe(false); // GUIDED MISSILES
    expect(isSpaceCoded({ pscCode: '1905' })).toBe(false); // COMBAT SHIPS
    expect(isSpaceCoded({ pscCode: 'AC15' })).toBe(false); // NATIONAL DEFENSE R&D
    expect(isSpaceCoded({ pscCode: 'R499' })).toBe(false); // SUPPORT- PROFESSIONAL
    expect(isSpaceCoded({})).toBe(false);
  });

  it('REFUSES the missile/space NAICS codes on their own, on purpose', () => {
    // 336414 is "GUIDED MISSILE AND SPACE VEHICLE MANUFACTURING" — counting it
    // would book tactical-missile production as space revenue. A launch award
    // under that NAICS still qualifies through its space PSC.
    expect(isSpaceCoded({ naicsCode: '336414' })).toBe(false);
    expect(isSpaceCoded({ naicsCode: '336415' })).toBe(false);
    expect(isSpaceCoded({ naicsCode: '336419' })).toBe(false);
    expect(isSpaceCoded({ naicsCode: '336414', pscCode: '1810' })).toBe(true);
  });

  it('catches a NASA grant, which carries no product/service code at all', () => {
    // Verified live: assistance awards return psc_code null and naics_code
    // null, and carry an assistance listing instead. Without the programme-
    // title rule every NASA research grant would read as non-space work.
    expect(
      isSpaceCoded({ pscCode: null, naicsCode: null, cfdaProgramTitle: 'SPACE TECHNOLOGY' })
    ).toBe(true);
    expect(
      isSpaceCoded({ pscCode: null, naicsCode: null, cfdaProgramTitle: 'Space Operations' })
    ).toBe(true);
  });

  it('REFUSES NASA money that is not space work', () => {
    // Both are real NASA assistance listings read from the live API.
    expect(isSpaceCoded({ cfdaProgramTitle: 'OFFICE OF STEM ENGAGEMENT (OSTEM)' })).toBe(false);
    expect(isSpaceCoded({ cfdaProgramTitle: 'AERONAUTICS' })).toBe(false);
    // Word boundary: "aerospace" must not qualify a programme.
    expect(isSpaceCoded({ cfdaProgramTitle: 'AEROSPACE WORKFORCE' })).toBe(false);
  });

  it('catches launch services, whose industry code is air freight', () => {
    // Verified live: Rocket Lab's NASA launch orders carry NAICS 481212
    // (nonscheduled chartered freight air transportation) with PSC V126.
    expect(isSpaceCoded({ naicsCode: '481212', pscCode: 'V126' })).toBe(true);
  });

  it('separates a prime’s space money from its whole federal book', () => {
    const rows = [
      award({ generatedInternalId: 'space', amount: 100, pscCode: '1810' }),
      award({ generatedInternalId: 'jets', amount: 9900, pscCode: '1510', naicsCode: '336411' }),
    ];
    expect(spaceCodedOnly(rows)).toHaveLength(1);
    expect(sumAmount(spaceCodedOnly(rows))).toBe(100);
    const [company] = totalsByCompany(rows);
    expect(company.obligatedUsd).toBe(10000);
    expect(company.spaceObligatedUsd).toBe(100);
    expect(company.spaceShare).toBeCloseTo(0.01);
    expect(company.spaceAwardCount).toBe(1);
  });
});

describe('award arithmetic refuses to fabricate', () => {
  it('never counts an indefinite-delivery vehicle toward dollars', () => {
    const rows = [
      award({ generatedInternalId: 'a', amount: 1000 }),
      award({ generatedInternalId: 'b', amount: 4000, awardGroup: 'idv', countsTowardTotals: false }),
    ];
    expect(countable(rows)).toHaveLength(1);
    expect(sumAmount(rows)).toBe(1000);
  });

  it('never counts an award whose amount the record does not state', () => {
    const rows = [
      award({ generatedInternalId: 'a', amount: 500 }),
      award({ generatedInternalId: 'b', amount: null }),
    ];
    expect(sumAmount(rows)).toBe(500);
    // The award still exists and is still counted as an award.
    expect(totalsByCompany(rows)[0].awardCount).toBe(2);
    expect(totalsByCompany(rows)[0].countedAwards).toBe(1);
  });

  it('measures how much of a company rides on one contract', () => {
    const rows = [
      award({ generatedInternalId: 'a', amount: 900 }),
      award({ generatedInternalId: 'b', amount: 100 }),
    ];
    const [company] = totalsByCompany(rows);
    expect(company.obligatedUsd).toBe(1000);
    expect(company.largestAwardUsd).toBe(900);
    expect(company.topAwardShare).toBeCloseTo(0.9);
    expect(concentrationBand(company.topAwardShare)).toBe('single-award dependent');
  });

  it('names the agency that actually gave the most money', () => {
    const rows = [
      award({ generatedInternalId: 'a', amount: 100 }),
      award({
        generatedInternalId: 'b',
        amount: 400,
        awardingAgency: 'Department of Defense',
        awardingSubAgency: 'Department of the Air Force',
      }),
    ];
    const [company] = totalsByCompany(rows);
    expect(company.leadAgency).toBe('Department of Defense');
    expect(company.leadAgencyShare).toBeCloseTo(0.8);
    expect(company.agencies).toHaveLength(2);
  });

  it('ranks agencies by dollars and reports their sub-agencies', () => {
    const rows = [
      award({ generatedInternalId: 'a', amount: 100 }),
      award({
        generatedInternalId: 'b',
        amount: 400,
        companyId: 'c-2',
        companyName: 'Company Two',
        awardingAgency: 'Department of Defense',
        awardingSubAgency: 'Department of the Air Force',
      }),
      award({
        generatedInternalId: 'c',
        amount: 50,
        awardingAgency: 'Department of Defense',
        awardingSubAgency: 'Department of the Navy',
      }),
    ];
    const agencies = totalsByAgency(rows);
    expect(agencies[0].shortName).toBe('DoD');
    expect(agencies[0].obligatedUsd).toBe(450);
    expect(agencies[0].companies).toBe(2);
    expect(agencies[0].subAgencies[0].name).toBe('Department of the Air Force');
    expect(agencies[1].shortName).toBe('NASA');
  });

  it('shortens only the agencies it knows, and never rewrites the rest', () => {
    expect(shortAgency('National Aeronautics and Space Administration')).toBe('NASA');
    expect(shortAgency('Department of Defense')).toBe('DoD');
    expect(shortAgency('Millennium Challenge Corporation')).toBe('Millennium Challenge Corporation');
  });

  it('reports no concentration when there is nothing to measure', () => {
    expect(hhi([])).toBeNull();
    expect(hhi([0, 0])).toBeNull();
    expect(topNShare([], 5)).toBeNull();
    expect(concentrationBand(null)).toBe('no measurable total');
  });

  it('computes a real HHI and a real top-N share', () => {
    // One firm with everything is a perfectly concentrated 10,000.
    expect(hhi([100])).toBe(10000);
    // Four equal firms: 4 x 25^2 = 2,500.
    expect(hhi([25, 25, 25, 25])).toBe(2500);
    expect(topNShare([50, 30, 10, 10], 2)).toBeCloseTo(0.8);
  });

  it('attributes an award to the window its obligation date falls in', () => {
    const rows = [
      award({ generatedInternalId: 'in', actionDate: new Date('2026-02-01T00:00:00Z') }),
      award({ generatedInternalId: 'out', actionDate: new Date('2026-04-01T00:00:00Z') }),
      award({ generatedInternalId: 'undated', actionDate: null, startDate: null }),
    ];
    const q1 = inWindow(rows, new Date('2026-01-01T00:00:00Z'), new Date('2026-04-01T00:00:00Z'));
    expect(q1.map((r) => r.generatedInternalId)).toEqual(['in']);
  });

  it('orders companies reproducibly, so a published ranking does not wobble', () => {
    const rows = [
      award({ generatedInternalId: 'a', amount: 100, companyId: 'z', companyName: 'Zeta' }),
      award({ generatedInternalId: 'b', amount: 100, companyId: 'a', companyName: 'Alpha' }),
    ];
    const first = totalsByCompany(rows).map((c) => c.companyName);
    const second = totalsByCompany(rows.slice().reverse()).map((c) => c.companyName);
    expect(first).toEqual(['Alpha', 'Zeta']);
    expect(second).toEqual(first);
  });
});

// ---------------------------------------------------------------------------
// 6. The release, and the standing product rule
// ---------------------------------------------------------------------------

describe('the Federal Space Awards release', () => {
  const release = getRelease('federal-space-awards');

  it('is on the calendar with a module, a methodology and a gated export', () => {
    expect(release).toBeDefined();
    expect(release!.cadence).toBe('quarterly');
    expect(fs.existsSync(path.join(process.cwd(), release!.computedBy))).toBe(true);
    expect(release!.exportHref('2026-Q2').startsWith('/api/research/')).toBe(true);
    expect(release!.methodology.length).toBeGreaterThanOrEqual(6);
  });

  it('states the three limits a buyer would otherwise assume away', () => {
    const method = release!.methodology.join(' ').toLowerCase();
    // Obligated, not ceiling.
    expect(method).toContain('obligated');
    // Prime only, no subawards.
    expect(method).toContain('prime');
    // Classified work is invisible.
    expect(method).toContain('classified');
  });

  it('does not publish a quarter before it has closed', () => {
    expect(release!.publishesLivePeriod).toBe(false);
  });

  it('keeps its id unique on the calendar', () => {
    expect(RESEARCH_RELEASES.filter((r) => r.id === 'federal-space-awards')).toHaveLength(1);
  });

  it('calls no model anywhere in the federal-award path', () => {
    const files = [
      'src/lib/gov-awards/match.ts',
      'src/lib/gov-awards/aggregate.ts',
      'src/lib/research-report-gov-awards.ts',
      'src/lib/fetchers/usaspending-awards-fetcher.ts',
      'src/app/api/research/gov-awards/route.ts',
      'src/app/api/cron/gov-awards-sync/route.ts',
    ];
    for (const file of files) {
      const src = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      expect(src).not.toMatch(/from '@\/lib\/ai-models'/);
      expect(src).not.toMatch(/@anthropic-ai/);
      expect(src).not.toMatch(/\bopenai\b/i);
    }
  });

  it('gates the screening route server-side before a row is read', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/research/gov-awards/route.ts'),
      'utf-8'
    );
    expect(src).toContain('requireResearchAccess');
    const gate = src.indexOf('requireResearchAccess(session?.user?.id)');
    const firstRead = src.indexOf('prisma.federalAward');
    expect(gate).toBeGreaterThan(-1);
    expect(firstRead).toBeGreaterThan(gate);
  });

  it('is watched by the freshness alarm, so a dead feed pages us', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/content-accuracy.ts'), 'utf-8');
    expect(src).toContain("source: 'usaspending-awards'");
    expect(src).toContain('checkFederalAwardsUsable');
    const cron = fs.readFileSync(path.join(process.cwd(), 'src/lib/cron-scheduler.ts'), 'utf-8');
    expect(cron).toContain('/api/cron/gov-awards-sync');
  });
});
