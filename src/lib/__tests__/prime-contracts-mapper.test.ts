import {
  isSpaceRelevant,
  classifyCategory,
  formatCompactValue,
  mapAwardToContract,
  getLast3FiscalYearsRange,
  buildSpendingByAwardRequest,
  PRIME_AGENCIES,
  MIN_AWARD_VALUE_USD,
  type UsaSpendingAwardRow,
} from '../prime-contracts';

describe('isSpaceRelevant', () => {
  it('matches core space vocabulary', () => {
    expect(isSpaceRelevant('GPS III satellite production')).toBe(true);
    expect(isSpaceRelevant('Launch services for national security space')).toBe(true);
    expect(isSpaceRelevant('Missile warning payload integration')).toBe(true);
    expect(isSpaceRelevant('NASA Orion crew module support')).toBe(true);
    expect(isSpaceRelevant('Geostationary orbit relay terminal')).toBe(true);
  });

  it('rejects non-space defense work', () => {
    expect(isSpaceRelevant('Apache helicopter maintenance services')).toBe(false);
    expect(isSpaceRelevant('Naval shipyard dry dock repairs')).toBe(false);
    expect(isSpaceRelevant('')).toBe(false);
    expect(isSpaceRelevant(null)).toBe(false);
    expect(isSpaceRelevant(undefined)).toBe(false);
  });
});

describe('classifyCategory', () => {
  it('classifies launch work', () => {
    expect(classifyCategory('Launch vehicle integration services for national security missions')).toBe('satellite_launch');
    expect(classifyCategory('Solid rocket booster launch support')).toBe('satellite_launch');
  });

  it('classifies defense/missile-warning work ahead of generic satellite terms', () => {
    expect(classifyCategory('Next-Gen OPIR missile warning satellite payload')).toBe('defense_systems');
    expect(classifyCategory('Space Domain Awareness sensor network')).toBe('defense_systems');
  });

  it('classifies ground-segment work', () => {
    expect(classifyCategory('Ground station antenna upgrade and telemetry support')).toBe('ground_systems');
  });

  it('classifies communications work', () => {
    expect(classifyCategory('GPS III satellite communications payload')).toBe('communications');
    expect(classifyCategory('Protected satellite communications terminal production')).toBe('communications');
  });

  it('classifies earth observation, space station, propulsion, lunar work', () => {
    expect(classifyCategory('Earth observation weather satellite imaging sensor')).toBe('earth_observation');
    expect(classifyCategory('International Space Station cargo resupply support')).toBe('space_station');
    expect(classifyCategory('Solid rocket motor propulsion system')).toBe('propulsion');
    expect(classifyCategory('Artemis lunar lander integration')).toBe('lunar_exploration');
  });

  it('falls back to research_development for generic space mentions', () => {
    expect(classifyCategory('Spacecraft bus engineering support services')).toBe('research_development');
    expect(classifyCategory('')).toBe('research_development');
    expect(classifyCategory(null)).toBe('research_development');
  });
});

describe('formatCompactValue', () => {
  it('formats billions, millions, thousands', () => {
    expect(formatCompactValue(1_500_000_000)).toBe('$1.5B');
    expect(formatCompactValue(12_300_000)).toBe('$12.3M');
    expect(formatCompactValue(1_000_000)).toBe('$1.0M');
    expect(formatCompactValue(45_000)).toBe('$45.0K');
    expect(formatCompactValue(500)).toBe('$500');
  });
});

describe('getLast3FiscalYearsRange', () => {
  it('spans 3 fiscal years ending with the current one (calendar-year date)', () => {
    // 2026-08-30 falls in FY2026 (Oct 2025 - Sep 2026)
    const range = getLast3FiscalYearsRange(new Date('2026-08-30T00:00:00Z'));
    expect(range).toEqual({ start_date: '2023-10-01', end_date: '2026-09-30' });
  });

  it('rolls forward correctly once October hits (new fiscal year starts)', () => {
    const range = getLast3FiscalYearsRange(new Date('2026-10-15T00:00:00Z'));
    expect(range).toEqual({ start_date: '2024-10-01', end_date: '2027-09-30' });
  });
});

describe('buildSpendingByAwardRequest', () => {
  it('builds the exact request shape USAspending expects', () => {
    const body = buildSpendingByAwardRequest(
      'Lockheed Martin',
      PRIME_AGENCIES.NASA,
      { start_date: '2023-10-01', end_date: '2026-09-30' },
      1,
      50
    );
    expect(body).toEqual({
      subawards: false,
      limit: 50,
      page: 1,
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        time_period: [{ start_date: '2023-10-01', end_date: '2026-09-30' }],
        recipient_search_text: ['Lockheed Martin'],
        agencies: [{ type: 'awarding', tier: 'toptier', name: 'National Aeronautics and Space Administration' }],
      },
      fields: ['Award ID', 'Recipient Name', 'Awarding Agency', 'Award Amount', 'Start Date', 'End Date', 'Description', 'generated_internal_id'],
      sort: 'Award Amount',
      order: 'desc',
    });
  });

  it('includes toptier_name for the subtier USSF agency filter', () => {
    const body = buildSpendingByAwardRequest('Boeing', PRIME_AGENCIES.USSF, { start_date: '2023-10-01', end_date: '2026-09-30' }, 1);
    expect(body.filters.agencies[0]).toEqual({
      type: 'awarding',
      tier: 'subtier',
      name: 'Department of the Air Force',
      toptier_name: 'Department of Defense',
    });
  });
});

describe('mapAwardToContract', () => {
  const baseAward: UsaSpendingAwardRow = {
    'Award ID': 'FA8811-26-C-0001',
    'Recipient Name': 'LOCKHEED MARTIN CORPORATION',
    'Awarding Agency': 'Department of the Air Force',
    'Award Amount': 45_000_000,
    'Start Date': '2026-03-15',
    'End Date': '2028-03-14',
    Description: 'GPS III Follow-on satellite production and space vehicle integration',
    generated_internal_id: 'CONT_AWD_ABC123',
  };

  it('maps a qualifying award into a GovernmentContract shape', () => {
    const mapped = mapAwardToContract(baseAward, 'Lockheed Martin', 'USSF');
    expect(mapped).not.toBeNull();
    expect(mapped?.slug).toBe('usaspending-CONT_AWD_ABC123');
    expect(mapped?.agency).toBe('USSF');
    expect(mapped?.awardee).toBe('Lockheed Martin');
    expect(mapped?.status).toBe('awarded');
    expect(mapped?.type).toBe('Award');
    expect(mapped?.value).toBe('$45.0M');
    expect(mapped?.valueMin).toBe(45_000_000);
    expect(mapped?.valueMax).toBe(45_000_000);
    expect(mapped?.category).toBe('communications');
    expect(mapped?.sourceUrl).toBe('https://www.usaspending.gov/award/CONT_AWD_ABC123');
    expect(mapped?.postedDate).toEqual(new Date('2026-03-15'));
    expect(mapped?.awardDate).toEqual(new Date('2026-03-15'));
    expect(mapped?.description.length).toBeLessThanOrEqual(500);
  });

  it('falls back to internal_id then Award ID when generated_internal_id is missing', () => {
    const { generated_internal_id, ...rest } = baseAward;
    void generated_internal_id;
    const withInternalId = mapAwardToContract({ ...rest, internal_id: 987 }, 'Lockheed Martin', 'NASA');
    expect(withInternalId?.slug).toBe('usaspending-987');

    const withNeither = mapAwardToContract({ ...rest }, 'Lockheed Martin', 'NASA');
    expect(withNeither?.slug).toBe(`usaspending-${baseAward['Award ID']}`);
  });

  it('skips awards under the $1M threshold', () => {
    const small = { ...baseAward, 'Award Amount': MIN_AWARD_VALUE_USD - 1 };
    expect(mapAwardToContract(small, 'Lockheed Martin', 'NASA')).toBeNull();
  });

  it('skips awards with no space keyword in the description or Award ID', () => {
    const nonSpace = { ...baseAward, Description: 'Aircraft engine maintenance depot services', 'Award ID': 'W91CRB-26-C-0099' };
    expect(mapAwardToContract(nonSpace, 'Lockheed Martin', 'NASA')).toBeNull();
  });

  it('skips awards missing a usable id', () => {
    const noId = { ...baseAward, generated_internal_id: null, internal_id: null, 'Award ID': null };
    expect(mapAwardToContract(noId, 'Lockheed Martin', 'NASA')).toBeNull();
  });

  it('skips awards missing a Start Date', () => {
    const noDate = { ...baseAward, 'Start Date': null };
    expect(mapAwardToContract(noDate, 'Lockheed Martin', 'NASA')).toBeNull();
  });

  it('skips awards with a non-numeric or missing Award Amount', () => {
    const noAmount = { ...baseAward, 'Award Amount': null };
    expect(mapAwardToContract(noAmount, 'Lockheed Martin', 'NASA')).toBeNull();
  });
});
