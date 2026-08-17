import {
  categorizeRegulatoryAction,
  isExportControlRelevant,
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

  it('every category has a display label', () => {
    for (const cat of RADAR_CATEGORIES) {
      expect(RADAR_CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });
});
