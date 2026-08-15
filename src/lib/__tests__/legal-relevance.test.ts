import { isRegulatoryRelevant, filterRegulatoryRelevant } from '../legal-relevance';

describe('isRegulatoryRelevant', () => {
  it('rejects generic launch/mission news with no regulatory substance', () => {
    expect(isRegulatoryRelevant('Chinese LM-7A Rocket Fails', '')).toBe(false);
    expect(isRegulatoryRelevant('SpaceX Launches 23 Starlink Satellites', '')).toBe(false);
    expect(isRegulatoryRelevant('Blue Origin Completes New Glenn Test Flight', '')).toBe(false);
    expect(isRegulatoryRelevant('Rocket Lab Electron Reaches Orbit', 'A successful mission for the small launcher.')).toBe(false);
  });

  it('accepts items mentioning FCC, FAA, ITAR, and export control substance', () => {
    expect(isRegulatoryRelevant('FCC Approves New Spectrum Allocation for LEO Constellations')).toBe(true);
    expect(isRegulatoryRelevant('FAA Issues New Launch License Rule for Reusable Vehicles')).toBe(true);
    expect(isRegulatoryRelevant('ITAR Reform Could Ease Export Restrictions on Satellite Parts')).toBe(true);
    expect(isRegulatoryRelevant('Commerce Department Updates Export Control Rules for Space Hardware')).toBe(true);
  });

  it('accepts items about treaties, rulings, bills, and policy', () => {
    expect(isRegulatoryRelevant('Senate Passes Commercial Space Launch Competitiveness Bill')).toBe(true);
    expect(isRegulatoryRelevant('Court Ruling Clarifies Orbital Debris Liability')).toBe(true);
    expect(isRegulatoryRelevant('New Treaty Provisions Address Lunar Resource Rights')).toBe(true);
    expect(isRegulatoryRelevant('FCC Opens Comment Period on New Licensing Rules')).toBe(true);
  });

  it('accepts items via the excerpt even when the title is generic', () => {
    expect(
      isRegulatoryRelevant('Industry Update', 'The FCC proposed new spectrum licensing requirements for satellite operators.')
    ).toBe(true);
  });

  it('requires space context for bare Congress/Senate mentions', () => {
    expect(isRegulatoryRelevant('Congress Debates Infrastructure Funding Bill')).toBe(true); // "bill" keyword alone qualifies
    expect(isRegulatoryRelevant('Senate Holds Hearing', 'General committee business on national infrastructure.')).toBe(false);
    expect(isRegulatoryRelevant('Senate Committee Reviews Space Launch Policy')).toBe(true);
  });

  it('does not false-positive on substrings inside unrelated words', () => {
    // "ear" should not match "early", "bill" should not match "billion", "bis" should not match "table"
    expect(isRegulatoryRelevant('Startup Raises Funding Early, Eyes Billion-Dollar Valuation', 'A notable milestone.')).toBe(false);
  });

  it('handles missing/empty input safely', () => {
    expect(isRegulatoryRelevant('', '')).toBe(false);
    expect(isRegulatoryRelevant(null, undefined)).toBe(false);
    expect(isRegulatoryRelevant(undefined)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isRegulatoryRelevant('fcc APPROVES new SPECTRUM rules')).toBe(true);
  });
});

describe('filterRegulatoryRelevant', () => {
  it('filters a mixed list down to only regulatory/legal items', () => {
    const items = [
      { title: 'Chinese LM-7A Rocket Fails', excerpt: '' },
      { title: 'FAA Issues New Launch License Rule', excerpt: '' },
      { title: 'SpaceX Launches 23 Starlink Satellites', excerpt: '' },
      { title: 'FCC Opens Comment Period on Spectrum Rules', excerpt: '' },
    ];

    const result = filterRegulatoryRelevant(items);

    expect(result.map((i) => i.title)).toEqual([
      'FAA Issues New Launch License Rule',
      'FCC Opens Comment Period on Spectrum Rules',
    ]);
  });

  it('returns an empty array when nothing is relevant', () => {
    const items = [
      { title: 'SpaceX Launches 23 Starlink Satellites', excerpt: '' },
      { title: 'Blue Origin Completes New Glenn Test Flight', excerpt: '' },
    ];

    expect(filterRegulatoryRelevant(items)).toEqual([]);
  });
});
