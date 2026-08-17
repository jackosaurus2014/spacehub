import {
  categorizeRegulatoryAction,
  extractPenaltyAmount,
  isEnforcementAction,
  isExportControlRelevant,
  matchRegulatoryCategories,
  RADAR_CATEGORIES,
  RADAR_CATEGORY_LABELS,
} from '../regulatory-categorizer';

describe('isExportControlRelevant', () => {
  it('matches core ITAR/EAR vocabulary', () => {
    expect(isExportControlRelevant('Amendments to the International Traffic in Arms Regulations')).toBe(true);
    expect(isExportControlRelevant('Revisions to the Export Administration Regulations')).toBe(true);
    expect(isExportControlRelevant('Additions to the United States Munitions List')).toBe(true);
    expect(isExportControlRelevant('Removal of License Exception availability for certain items')).toBe(true);
    expect(isExportControlRelevant('Changes to ECCN 9x515 classifications')).toBe(true);
    expect(isExportControlRelevant('Commerce Control List: 600 series updates')).toBe(true);
    expect(isExportControlRelevant('DDTC name change administrative notice')).toBe(true);
  });

  it('does not false-positive on "year", "clear", or unrelated text', () => {
    expect(isExportControlRelevant('Fiscal year budget request for weather satellites')).toBe(false);
    expect(isExportControlRelevant('Clear skies initiative for airport operations')).toBe(false);
    expect(isExportControlRelevant('Passport fee schedule update')).toBe(false);
  });
});

describe('categorizeRegulatoryAction', () => {
  it('categorizes export-control documents', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'International Traffic in Arms Regulations: U.S. Munitions List Category IV',
        summary: 'DDTC amends the USML.',
      })
    ).toBe('export-controls');
    expect(
      categorizeRegulatoryAction({
        title: 'Export Administration Regulations: Commerce Control List amendments',
        summary: null,
      })
    ).toBe('export-controls');
  });

  it('categorizes launch licensing documents', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'Streamlined Launch and Reentry License Requirements (Part 450)',
        summary: 'Commercial space transportation licensing updates.',
      })
    ).toBe('launch-licensing');
  });

  it('categorizes spectrum documents', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'Spectrum sharing between NGSO fixed-satellite systems',
        summary: 'Frequency allocation rules for non-geostationary constellations.',
      })
    ).toBe('spectrum');
  });

  it('categorizes remote sensing documents', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'Licensing of Private Remote Sensing Space Systems',
        summary: 'Part 960 earth observation license conditions.',
      })
    ).toBe('remote-sensing');
  });

  it('categorizes space traffic documents', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'Orbital Debris Mitigation Standard Practices',
        summary: 'Post-mission disposal and collision avoidance requirements.',
      })
    ).toBe('space-traffic');
  });

  it('categorizes procurement/policy documents', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'Defense Federal Acquisition Regulation Supplement: commercial space contracting',
        summary: 'DFARS procurement updates.',
      })
    ).toBe('procurement-policy');
  });

  it('falls back to the issuing agency home turf when keywords are inconclusive', () => {
    expect(
      categorizeRegulatoryAction({
        title: 'Administrative practice updates',
        summary: null,
        agencies: ['Bureau of Industry and Security'],
      })
    ).toBe('export-controls');
    expect(
      categorizeRegulatoryAction({
        title: 'Administrative practice updates',
        summary: null,
        agencies: ['Federal Aviation Administration'],
      })
    ).toBe('launch-licensing');
    expect(
      categorizeRegulatoryAction({
        title: 'Administrative practice updates',
        summary: null,
        agencies: ['Federal Communications Commission'],
      })
    ).toBe('spectrum');
    expect(
      categorizeRegulatoryAction({
        title: 'Administrative practice updates',
        summary: null,
        agencies: ['National Oceanic and Atmospheric Administration'],
      })
    ).toBe('remote-sensing');
  });

  it('returns other when nothing matches', () => {
    expect(
      categorizeRegulatoryAction({ title: 'Meeting of the advisory committee', summary: null })
    ).toBe('other');
  });

  it('every category has a display label (union completeness)', () => {
    for (const cat of RADAR_CATEGORIES) {
      expect(RADAR_CATEGORY_LABELS[cat]).toBeTruthy();
    }
    expect(RADAR_CATEGORIES).toContain('enforcement');
    expect(Object.keys(RADAR_CATEGORY_LABELS).sort()).toEqual([...RADAR_CATEGORIES].sort());
  });

  it('routes enforcement actions to the enforcement category ahead of keyword scoring', () => {
    // An ITAR consent agreement is full of export-control vocabulary, but its
    // radar identity is enforcement.
    expect(
      categorizeRegulatoryAction({
        title: 'In the Matter of: Acme Aerospace; Consent Agreement Under the International Traffic in Arms Regulations',
        summary: 'ITAR civil penalty settlement covering unauthorized defense article exports.',
      })
    ).toBe('enforcement');
  });
});

describe('isEnforcementAction', () => {
  // Real Federal Register title shapes, verified against the live API 8/17.
  it('matches BIS denial orders and settlement orders', () => {
    expect(
      isEnforcementAction({
        title:
          'Aviastar-TU, 5 b. 7 Leningradsky prospect g. Moskva, 125040, Moscow, Russia; Order Renewing Temporary Denial of Export Privileges',
      })
    ).toBe(true);
    expect(
      isEnforcementAction({
        title: 'In the Matter of: Dina Zhu, 101 Windsor Chase Drive, Lawrenceville, GA 30043; Order Relating to Dina Zhu',
      })
    ).toBe(true);
    expect(isEnforcementAction({ title: 'Acme Corp; Settlement Agreement', actionText: null })).toBe(true);
  });

  it('matches DDTC statutory debarments (and rescissions)', () => {
    expect(
      isEnforcementAction({
        title:
          'Bureau of Political-Military Affairs; Statutory Debarment Under the Arms Export Control Act and the International Traffic in Arms Regulations',
      })
    ).toBe(true);
    expect(
      isEnforcementAction({
        title: 'Bureau of Political-Military Affairs; Rescission of Statutory Debarment of Dominick DeQuarto, Under the International Traffic in Arms Regulations',
      })
    ).toBe(true);
  });

  it('matches FCC forfeitures/NALs and FAA civil penalties', () => {
    expect(isEnforcementAction({ title: 'Orbital Sat Co.; Forfeiture Order' })).toBe(true);
    expect(isEnforcementAction({ title: 'Notice of Apparent Liability for Forfeiture; SpaceCom LLC' })).toBe(true);
    expect(isEnforcementAction({ title: 'Launch Operator X', actionText: 'Order assessing civil penalty.' })).toBe(true);
  });

  it('does NOT match rules ABOUT penalties (inflation adjustments) or ordinary rulemaking', () => {
    expect(
      isEnforcementAction({ title: 'Civil Monetary Penalty Adjustments for Inflation' })
    ).toBe(false);
    expect(
      isEnforcementAction({ title: 'Annual Adjustment of Civil Monetary Penalty Amounts' })
    ).toBe(false);
    expect(isEnforcementAction({ title: 'Streamlined Launch and Reentry License Requirements' })).toBe(false);
    expect(isEnforcementAction({ title: 'Revisions to the Export Administration Regulations' })).toBe(false);
  });
});

describe('extractPenaltyAmount', () => {
  it('returns the literal matched amount string', () => {
    expect(extractPenaltyAmount('agreed to pay a civil penalty of $1,500,000 to resolve')).toBe('$1,500,000');
    expect(extractPenaltyAmount('a $2.7 million settlement')).toBe('$2.7 million');
  });

  it('returns the largest amount when several appear', () => {
    expect(
      extractPenaltyAmount('statutory maximum of $353,534 per violation; total penalty of $5,000,000')
    ).toBe('$5,000,000');
    expect(extractPenaltyAmount('$300,000 suspended out of a $1.1 million penalty')).toBe('$1.1 million');
  });

  it('returns null when no amount is parseable — never invents a number', () => {
    expect(extractPenaltyAmount('Order Denying Export Privileges for ten years')).toBeNull();
    expect(extractPenaltyAmount('')).toBeNull();
  });
});

describe('matchRegulatoryCategories (article cross-link matcher)', () => {
  it('matches export-controls on a single distinctive term', () => {
    expect(matchRegulatoryCategories('The startup navigated ITAR registration hurdles')).toContain('export-controls');
  });

  it('requires two hits for other categories', () => {
    // one spectrum keyword only — no match
    expect(matchRegulatoryCategories('The company acquired new spectrum assets')).toEqual([]);
    // two spectrum keywords — match
    expect(
      matchRegulatoryCategories('The FCC granted the NGSO constellation new Ka-band spectrum in a Part 25 order')
    ).toContain('spectrum');
  });

  it('returns [] for ordinary space news with no regulatory hook', () => {
    expect(
      matchRegulatoryCategories('SpaceX launched 23 Starlink satellites from Cape Canaveral on Tuesday night.')
    ).toEqual([]);
  });
});
