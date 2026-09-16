/**
 * @jest-environment node
 */

/**
 * The two rules that decide what a published "space funding" figure counts,
 * and the rule that turns one free-text investor string into investor names.
 *
 * These exist because the Q2 2026 edition of Most Active Space Investors
 * published "$84.9B DISCLOSED CAPITAL" for one quarter — about ten times the
 * real market — and ranked a firm that led two rounds as the most active
 * investor in space. Both were arithmetic over rows that were never checked
 * for what KIND of transaction they were or whose name was in the column.
 *
 * Every case below is a row shape that is actually in our database.
 */

import {
  CROSS_DOMAIN_SECTORS,
  SPACE_VENTURE_RULE,
  classifyInstrument,
  exclusionReason,
  isSpaceAttributed,
  qualifiesAsSpaceVenture,
  spaceAttribution,
} from '../funding/space-classification';
import {
  INVESTOR_ALIASES,
  investorKey,
  investorNameAudit,
  normalizeInvestorName,
  splitInvestorString,
} from '../funding/investor-names';

const company = (sector: string | null, subsector: string | null = null, isPublic = false) => ({
  sector,
  subsector,
  isPublic,
});

// ---------------------------------------------------------------------------
// 1. The instrument test
// ---------------------------------------------------------------------------

describe('what kind of transaction this is', () => {
  it('refuses an IPO — the single row that was 88% of the $84.9B headline', () => {
    const spacexIpo = {
      seriesLabel: 'IPO',
      roundType: 'ipo',
      company: company('launch', 'heavy-lift', true),
    };
    expect(classifyInstrument(spacexIpo)).toBe('public-market');
    expect(qualifiesAsSpaceVenture(spacexIpo)).toBe(false);
    expect(exclusionReason(spacexIpo)).toMatch(/public-market offering/i);
  });

  it('refuses a tender offer — existing shares, no capital into the company', () => {
    // This is the $10.0B row that made Fidelity the top TTM "investor".
    const tender = {
      seriesLabel: 'Tender Offer',
      roundType: 'equity',
      company: company('launch', 'heavy-lift', true),
    };
    expect(classifyInstrument(tender)).toBe('secondary');
    expect(exclusionReason(tender)).toMatch(/already existed/i);
  });

  it('refuses registered directs, debt and grants', () => {
    expect(
      classifyInstrument({ seriesLabel: 'Registered Direct', roundType: 'equity', company: company('analytics', null, true) })
    ).toBe('public-market');
    expect(classifyInstrument({ seriesLabel: null, roundType: 'debt', company: company('launch') })).toBe('debt');
    expect(classifyInstrument({ seriesLabel: 'Grant', roundType: 'grant', company: company('launch') })).toBe('grant');
  });

  it('reads a private placement by the company, not by the label', () => {
    // Into a listed company it is a PIPE; into a private one it is a round.
    expect(
      classifyInstrument({ seriesLabel: 'Private Placement', roundType: 'equity', company: company('analytics', null, true) })
    ).toBe('public-market');
    expect(
      classifyInstrument({ seriesLabel: 'Private Placement', roundType: 'equity', company: company('analytics', null, false) })
    ).toBe('venture');
  });

  it('counts every ordinary private round shape our data carries', () => {
    for (const stage of ['Seed', 'Series A', 'Series D Extension', 'Growth', 'Bridge', 'Pre-IPO', 'Debut Round', 'Convertible Note']) {
      expect(classifyInstrument({ seriesLabel: stage, roundType: 'equity', company: company('launch') })).toBe('venture');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. The recipient test
// ---------------------------------------------------------------------------

describe('whether the money went to space work', () => {
  it('refuses the defence companies whose own subsector is not space', () => {
    // Anduril ($5.0B Series H) and Hermeus ($350M growth) — the two rounds
    // that survived the instrument test and still are not space money.
    expect(isSpaceAttributed(company('defense', 'autonomous-defense'))).toBe(false);
    expect(isSpaceAttributed(company('defense', 'hypersonic-systems'))).toBe(false);
    expect(isSpaceAttributed(company('defense', null))).toBe(false);
  });

  it('keeps the defence company whose own subsector names space', () => {
    // True Anomaly, sector defense, subsector space-domain-awareness.
    expect(isSpaceAttributed(company('defense', 'space-domain-awareness'))).toBe(true);
    expect(spaceAttribution(company('defense', 'space-domain-awareness'))).toBe('space');
  });

  it('keeps every space-native sector without needing a subsector', () => {
    for (const sector of ['launch', 'satellite', 'ground-segment', 'analytics', 'infrastructure', 'manufacturing', 'exploration']) {
      expect(isSpaceAttributed(company(sector))).toBe(true);
    }
  });

  it('fails closed on a company with no recorded sector', () => {
    expect(isSpaceAttributed(company(null))).toBe(false);
    expect(isSpaceAttributed(null)).toBe(false);
    expect(exclusionReason({ seriesLabel: 'Series A', roundType: 'equity', company: company(null) })).toMatch(
      /no recorded sector/i
    );
  });

  it('never consults the marketing tag cloud, which would readmit the excluded rounds', () => {
    // Anduril and Hermeus both tag themselves "defense-space". A tag match
    // would put both back in the figure; the subsector correctly refuses them.
    const withSpaceTag = { sector: 'defense', subsector: 'autonomous-defense', tags: ['defense-space', 'space-domain-awareness'] };
    expect(isSpaceAttributed(withSpaceTag)).toBe(false);
  });

  it('names every cross-domain sector explicitly rather than guessing', () => {
    expect(CROSS_DOMAIN_SECTORS).toContain('defense');
    expect(CROSS_DOMAIN_SECTORS).toContain('aerospace');
    expect(CROSS_DOMAIN_SECTORS).not.toContain('launch');
  });
});

// ---------------------------------------------------------------------------
// 3. The published rule
// ---------------------------------------------------------------------------

describe('the rule that travels with the figure', () => {
  it('states both tests and admits the direction of its own error', () => {
    const text = SPACE_VENTURE_RULE.join(' ');
    expect(text).toMatch(/IPOs/);
    expect(text).toMatch(/tender offers/i);
    expect(text).toMatch(/grants/i);
    expect(text).toMatch(/conservative floor/i);
    expect(text).toMatch(/nothing is deleted/i);
  });

  it('never claims to estimate or model anything', () => {
    const text = SPACE_VENTURE_RULE.join(' ');
    expect(text).not.toMatch(/\b(estimate[sd]?|projected|forecast|approximate)\b/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Splitting co-lead strings
// ---------------------------------------------------------------------------

describe('one recorded string, the investors it names', () => {
  it('splits the co-lead strings that broke the ranking', () => {
    expect(splitInvestorString('Eclipse / Riot Ventures')).toEqual(['Eclipse Ventures', 'Riot Ventures']);
    expect(splitInvestorString('Type One Ventures / Qatar Investment Authority')).toEqual([
      'Type One Ventures',
      'Qatar Investment Authority',
    ]);
    expect(splitInvestorString('137 Ventures / Banner VC')).toEqual(['137 Ventures', 'Banner VC']);
    expect(splitInvestorString('B Capital / Shield Capital / Cerberus Ventures')).toEqual([
      'B Capital Group',
      'Shield Capital',
      'Cerberus Ventures',
    ]);
  });

  it('leaves an ampersand alone, because firms are named with them', () => {
    // Splitting on "&" would shatter all three of these single firms.
    expect(splitInvestorString('Kongsberg Defence & Aerospace')).toEqual(['Kongsberg Defence & Aerospace']);
    expect(splitInvestorString('Mitsui & Co.')).toEqual(['Mitsui & Co.']);
    // And so a genuine "&" co-lead pair is UNDER-credited on purpose.
    expect(splitInvestorString('National Reconstruction Fund Corp & Hostplus')).toEqual([
      'National Reconstruction Fund Corp & Hostplus',
    ]);
    // A slash still splits even when a segment carries an ampersand.
    expect(splitInvestorString('Brindabella & Company / NRFC')).toEqual(['Brindabella & Company', 'NRFC']);
  });

  it('leaves a comma inside a name alone', () => {
    expect(splitInvestorString('ESA European Launcher Challenge (Germany, UK)')).toEqual([
      'ESA European Launcher Challenge',
    ]);
  });

  it('abandons a split that would mint a fragment instead of a firm', () => {
    expect(splitInvestorString('S / W')).toEqual(['S / W']);
    expect(splitInvestorString('Something /')).toEqual(['Something /']);
  });

  it('does not split a slash with no spaces around it', () => {
    expect(splitInvestorString('Andreessen Horowitz/a16z Growth')).toEqual(['Andreessen Horowitz/a16z Growth']);
  });

  it('drops an editor’s acquisition note, which is not an investor', () => {
    expect(splitInvestorString('Acquired by Firefly Aerospace')).toEqual([]);
    expect(splitInvestorString('Lockheed Martin acquires Terran Orbital')).toEqual([]);
    // But a SPAC with "Acquisition" in its legal name survives.
    expect(splitInvestorString('Osprey Technology Acquisition Corp')).toEqual(['Osprey Technology Acquisition Corp']);
    expect(splitInvestorString('NextGen Acquisition Corp II')).toEqual(['NextGen Acquisition Corp II']);
  });

  it('never returns a duplicate from one string', () => {
    expect(splitInvestorString('a16z / Andreessen Horowitz')).toEqual(['Andreessen Horowitz']);
  });

  it('returns nothing for a blank column', () => {
    expect(splitInvestorString(null)).toEqual([]);
    expect(splitInvestorString('   ')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Normalising variants
// ---------------------------------------------------------------------------

describe('two spellings of one firm', () => {
  it('drops a trailing parenthetical qualifier', () => {
    expect(normalizeInvestorName('a16z (Andreessen Horowitz)')).toBe('Andreessen Horowitz');
    expect(normalizeInvestorName('DCVC (Data Collective)')).toBe('DCVC');
    expect(normalizeInvestorName('Jed McCaleb (founder)')).toBe('Jed McCaleb');
    expect(normalizeInvestorName('Lockheed Martin (strategic)')).toBe('Lockheed Martin');
  });

  it('merges the variants that both appear in our own data', () => {
    expect(investorKey('a16z')).toBe(investorKey('Andreessen Horowitz'));
    expect(investorKey('Eclipse')).toBe(investorKey('Eclipse Ventures'));
    expect(investorKey('B Capital')).toBe(investorKey('B Capital Group'));
    expect(investorKey('Lightspeed')).toBe(investorKey('Lightspeed Venture Partners'));
    expect(investorKey('Seraphim Capital')).toBe(investorKey('Seraphim Space'));
    expect(investorKey('US Innovative Technology Fund')).toBe(investorKey('U.S. Innovative Technology Fund'));
  });

  it('never merges two firms that only look alike', () => {
    expect(investorKey('Index Ventures')).not.toBe(investorKey('Interlagos'));
    expect(investorKey('Eclipse Ventures')).not.toBe(investorKey('Eclipse Capital'));
    expect(investorKey('Lux Capital')).not.toBe(investorKey('Lux Aeterna'));
  });

  it('keeps the alias table small enough to check by eye', () => {
    expect(Object.keys(INVESTOR_ALIASES).length).toBeLessThanOrEqual(30);
  });

  it('leaves an unknown name exactly as recorded', () => {
    expect(normalizeInvestorName('Some Fund Nobody Has Heard Of')).toBe('Some Fund Nobody Has Heard Of');
  });
});

// ---------------------------------------------------------------------------
// 6. The audit trail
// ---------------------------------------------------------------------------

describe('the published audit of what was rewritten', () => {
  const audit = investorNameAudit([
    'Eclipse / Riot Ventures',
    'Eclipse / Riot Ventures',
    'a16z (Andreessen Horowitz)',
    'Lux Capital',
    'Acquired by Firefly Aerospace',
    null,
  ]);

  it('lists every string it changed and nothing it did not', () => {
    const recorded = audit.map((r) => r.recorded);
    expect(recorded).toContain('Eclipse / Riot Ventures');
    expect(recorded).toContain('a16z (Andreessen Horowitz)');
    expect(recorded).toContain('Acquired by Firefly Aerospace');
    // Passed through untouched, so there is nothing to audit.
    expect(recorded).not.toContain('Lux Capital');
  });

  it('names the rule that fired and how many rows carried the string', () => {
    const split = audit.find((r) => r.recorded === 'Eclipse / Riot Ventures')!;
    expect(split.action).toBe('split-and-renamed');
    expect(split.resolved).toBe('Eclipse Ventures; Riot Ventures');
    expect(split.occurrences).toBe(2);

    const renamed = audit.find((r) => r.recorded === 'a16z (Andreessen Horowitz)')!;
    expect(renamed.action).toBe('renamed');
    expect(renamed.resolved).toBe('Andreessen Horowitz');

    const dropped = audit.find((r) => r.recorded === 'Acquired by Firefly Aerospace')!;
    expect(dropped.action).toBe('dropped');
  });
});
