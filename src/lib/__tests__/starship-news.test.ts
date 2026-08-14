/**
 * Tests for src/lib/starship-news.ts — the shared Starship-program news
 * matcher/fetcher backing the /starship live news rail and the
 * 'starship-tracker-freshness' content-accuracy sentinel check.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    newsArticle: { findMany: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import { matchesStarshipNews, getStarshipNewsArticles } from '@/lib/starship-news';

const mockPrisma = prisma as unknown as {
  newsArticle: { findMany: jest.Mock };
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('matchesStarshipNews', () => {
  describe('positive matches', () => {
    it('matches "starship" paired with a SpaceX context term (spacex)', () => {
      expect(
        matchesStarshipNews({
          title: 'SpaceX Starship completes 13th test flight',
          summary: null,
        })
      ).toBe(true);
    });

    it('matches "starship" paired with a SpaceX context term in the summary, not the title', () => {
      expect(
        matchesStarshipNews({
          title: 'Megarocket achieves historic ocean splashdown',
          summary: 'Starship flew its 13th flight test, deploying Starlink V3 satellites.',
        })
      ).toBe(true);
    });

    it('matches "super heavy" paired with a rocket/SpaceX context term', () => {
      expect(
        matchesStarshipNews({
          title: 'Super Heavy booster achieves soft splashdown after launch',
          summary: null,
        })
      ).toBe(true);
    });

    it('matches the exact phrase "raptor engine"', () => {
      expect(
        matchesStarshipNews({
          title: 'SpaceX tests upgraded raptor engine ahead of next flight',
          summary: null,
        })
      ).toBe(true);
    });

    it('matches "starbase" paired with a location/program context term', () => {
      expect(
        matchesStarshipNews({
          title: 'Starbase, Texas prepares for next SpaceX launch',
          summary: null,
        })
      ).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(
        matchesStarshipNews({ title: 'STARSHIP flight 14 targets late August launch, SpaceX says', summary: null })
      ).toBe(true);
    });
  });

  describe('negative matches (false-positive guards)', () => {
    it('does NOT match "starship" used in its generic sci-fi sense', () => {
      expect(
        matchesStarshipNews({
          title: 'New Star Trek starship unveiled in trailer for next film',
          summary: 'Fans are excited about the sleek new starship design.',
        })
      ).toBe(false);
    });

    it('does NOT match "super heavy" used in an unrelated (trucking) sense', () => {
      expect(
        matchesStarshipNews({
          title: 'Super heavy load permits proposed for state highways',
          summary: 'The trucking industry is pushing back on new weight limits.',
        })
      ).toBe(false);
    });

    it('does NOT match bare "raptor" with no "engine" or SpaceX context', () => {
      expect(
        matchesStarshipNews({
          title: 'Ford unveils redesigned Raptor pickup truck for 2027',
          summary: null,
        })
      ).toBe(false);
    });

    it('does NOT match "starbase" used in its Star Trek game sense', () => {
      expect(
        matchesStarshipNews({
          title: 'New Starbase expansion pack announced for strategy game',
          summary: null,
        })
      ).toBe(false);
    });

    it('does NOT match unrelated space news', () => {
      expect(
        matchesStarshipNews({
          title: 'Rocket Lab launches Electron from Mahia Peninsula',
          summary: 'The mission carried a commercial Earth-observation satellite.',
        })
      ).toBe(false);
    });
  });
});

describe('getStarshipNewsArticles', () => {
  it('queries with an OR pre-filter, applies the precise matcher, and slices to the limit', async () => {
    const now = new Date();
    mockPrisma.newsArticle.findMany.mockResolvedValueOnce([
      { id: '1', title: 'SpaceX Starship Flight 14 targets tower catch', summary: null, url: 'u1', source: 's', category: 'c', imageUrl: null, publishedAt: now },
      { id: '2', title: 'Starship Troopers sequel announced', summary: null, url: 'u2', source: 's', category: 'c', imageUrl: null, publishedAt: now },
      { id: '3', title: 'Super Heavy booster splashdown deemed a success', summary: 'SpaceX called it a milestone for the rocket program.', url: 'u3', source: 's', category: 'c', imageUrl: null, publishedAt: now },
    ]);

    const result = await getStarshipNewsArticles(2);

    expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { publishedAt: 'desc' },
        take: 150,
      })
    );
    expect(result.map((a) => a.id)).toEqual(['1', '3']);
  });

  it('returns an empty array when nothing matches', async () => {
    mockPrisma.newsArticle.findMany.mockResolvedValueOnce([
      { id: '1', title: 'Starship Troopers reboot in development', summary: null, url: 'u1', source: 's', category: 'c', imageUrl: null, publishedAt: new Date() },
    ]);
    const result = await getStarshipNewsArticles(12);
    expect(result).toEqual([]);
  });
});
