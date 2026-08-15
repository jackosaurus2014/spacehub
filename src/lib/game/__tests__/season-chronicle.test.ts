/**
 * Live-Service Wave LS7 — season-chronicle.ts (Season Chronicle archive +
 * prestige titles). Pure assembly/derivation, no DB — the same split
 * corporate-eras.test.ts exercises for its era records.
 */
import { assembleSeasonChronicle, derivePrestigeTitles, hasAnyPrestigeTitle, type SeasonChronicleRecord } from '../season-chronicle';
import { getSuperCycleForSeason } from '../economic-seasons';

const BASE_PLACEMENTS = [
  { profileId: 'p1', companyName: 'Solaris Dynamics', title: 'Titan', totalScore: 9000, bracket: 3 },
  { profileId: 'p2', companyName: 'Belt Runners Inc', title: null, totalScore: 12000, bracket: 4 },
  { profileId: 'p3', companyName: 'Ceres Mining Co', title: 'Baron', totalScore: 7000, bracket: 2 },
  { profileId: 'p4', companyName: 'Nova Ventures', title: null, totalScore: 500, bracket: 1 },
];

describe('season-chronicle: assembleSeasonChronicle', () => {
  test('ranks placements by totalScore desc and keeps only the top 3', () => {
    const record = assembleSeasonChronicle({
      seasonNumber: 5,
      seasonType: 'asteroid_rush',
      title: 'Asteroid Rush — Season 5',
      startsAt: 1000,
      endsAt: 2000,
      participantCount: 40,
      placements: BASE_PLACEMENTS,
      nowMs: 5000,
    });

    expect(record.topPlacements).toHaveLength(3);
    expect(record.topPlacements[0]).toMatchObject({ companyName: 'Belt Runners Inc', rank: 1 });
    expect(record.topPlacements[1]).toMatchObject({ companyName: 'Solaris Dynamics', rank: 2 });
    expect(record.topPlacements[2]).toMatchObject({ companyName: 'Ceres Mining Co', rank: 3 });
    // 4th place (Nova Ventures) is excluded from the permanent record.
    expect(record.topPlacements.find(p => p.companyName === 'Nova Ventures')).toBeUndefined();
  });

  test('is deterministic — reassembling identical input yields an identical record (nowMs pinned)', () => {
    const input = {
      seasonNumber: 8,
      seasonType: 'mars_colony_race',
      title: 'Mars Colony Race — Season 8',
      startsAt: 100,
      endsAt: 200,
      participantCount: 12,
      placements: BASE_PLACEMENTS,
      nowMs: 999,
    };
    const a = assembleSeasonChronicle(input);
    const b = assembleSeasonChronicle(input);
    expect(a).toEqual(b);
  });

  test('theme is derived from seasonNumber via economic-seasons.ts, never passed in', () => {
    const record = assembleSeasonChronicle({
      seasonNumber: 14,
      seasonType: 'fleet_command',
      title: 'Fleet Command — Season 14',
      startsAt: 0,
      endsAt: 1,
      participantCount: 1,
      placements: [],
      nowMs: 0,
    });
    const expectedTheme = getSuperCycleForSeason(14);
    expect(record.themeId).toBe(expectedTheme.id);
    expect(record.themeName).toBe(expectedTheme.name);
  });

  test('notableEvents leads with the theme description, then appends caller-supplied notes', () => {
    const record = assembleSeasonChronicle({
      seasonNumber: 3,
      seasonType: 'solar_storm_crisis',
      title: 'Solar Storm Crisis — Season 3',
      startsAt: 0,
      endsAt: 1,
      participantCount: 5,
      placements: [],
      notableEvents: ['A record He-3 price spike hit $48M/unit.'],
      nowMs: 0,
    });
    expect(record.notableEvents[0]).toContain(getSuperCycleForSeason(3).name);
    expect(record.notableEvents).toContain('A record He-3 price spike hit $48M/unit.');
  });

  test('handles an empty placements list without throwing', () => {
    const record = assembleSeasonChronicle({
      seasonNumber: 1,
      seasonType: 'asteroid_rush',
      title: 'Asteroid Rush — Season 1',
      startsAt: 0,
      endsAt: 1,
      participantCount: 0,
      placements: [],
      nowMs: 0,
    });
    expect(record.topPlacements).toEqual([]);
    expect(record.participantCount).toBe(0);
  });

  test('allianceOutcomes defaults to an empty array when omitted', () => {
    const record = assembleSeasonChronicle({
      seasonNumber: 2,
      seasonType: 'asteroid_rush',
      title: 'Asteroid Rush — Season 2',
      startsAt: 0,
      endsAt: 1,
      participantCount: 0,
      placements: [],
      nowMs: 0,
    });
    expect(record.allianceOutcomes).toEqual([]);
  });
});

function makeRecord(seasonNumber: number, placements: { companyName: string; rank: number; totalScore: number }[]): SeasonChronicleRecord {
  const theme = getSuperCycleForSeason(seasonNumber);
  return {
    seasonNumber,
    seasonType: 'asteroid_rush',
    title: `Season ${seasonNumber}`,
    startsAt: 0,
    endsAt: 1,
    themeId: theme.id,
    themeName: theme.name,
    themeIcon: theme.icon,
    themeHeadlines: [],
    participantCount: 10,
    topPlacements: placements.map(p => ({ profileId: p.companyName, companyName: p.companyName, title: null, totalScore: p.totalScore, bracket: 1, rank: p.rank })),
    allianceOutcomes: [],
    notableEvents: [],
    sealedAtMs: 0,
  };
}

describe('season-chronicle: derivePrestigeTitles', () => {
  test('grants a Champion title for a rank-1 finish', () => {
    const records = [makeRecord(4, [{ companyName: 'Solaris Dynamics', rank: 1, totalScore: 1 }])];
    const titles = derivePrestigeTitles(records, 'Solaris Dynamics');
    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({ rank: 1, seasonNumber: 4 });
    expect(titles[0].label).toContain('Champion');
  });

  test('grants a Podium Finisher title for rank 2 or 3', () => {
    const records = [makeRecord(4, [{ companyName: 'Belt Runners Inc', rank: 2, totalScore: 1 }])];
    const titles = derivePrestigeTitles(records, 'Belt Runners Inc');
    expect(titles[0].label).toContain('Podium Finisher');
  });

  test('a company absent from every record earns no titles', () => {
    const records = [makeRecord(4, [{ companyName: 'Solaris Dynamics', rank: 1, totalScore: 1 }])];
    expect(derivePrestigeTitles(records, 'Nobody Corp')).toEqual([]);
    expect(hasAnyPrestigeTitle(records, 'Nobody Corp')).toBe(false);
  });

  test('accumulates titles across multiple seasons, newest first', () => {
    const records = [
      makeRecord(10, [{ companyName: 'Solaris Dynamics', rank: 2, totalScore: 1 }]),
      makeRecord(6, [{ companyName: 'Solaris Dynamics', rank: 1, totalScore: 1 }]),
      makeRecord(2, [{ companyName: 'Solaris Dynamics', rank: 3, totalScore: 1 }]),
    ];
    const titles = derivePrestigeTitles(records, 'Solaris Dynamics');
    expect(titles.map(t => t.seasonNumber)).toEqual([10, 6, 2]);
    expect(hasAnyPrestigeTitle(records, 'Solaris Dynamics')).toBe(true);
  });

  test('company name matching is exact (no accidental substring matches)', () => {
    const records = [makeRecord(4, [{ companyName: 'Solaris Dynamics', rank: 1, totalScore: 1 }])];
    expect(derivePrestigeTitles(records, 'Solaris')).toEqual([]);
    expect(derivePrestigeTitles(records, 'Solaris Dynamics Inc')).toEqual([]);
  });
});
