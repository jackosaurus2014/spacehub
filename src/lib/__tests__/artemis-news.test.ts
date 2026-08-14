/**
 * Tests for src/lib/artemis-news.ts — the shared Artemis-program news
 * matcher/fetcher backing the /artemis live news rail and the
 * 'artemis-tracker-freshness' content-accuracy sentinel check.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    newsArticle: { findMany: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import { matchesArtemisNews, getArtemisNewsArticles } from '@/lib/artemis-news';

const mockPrisma = prisma as unknown as {
  newsArticle: { findMany: jest.Mock };
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('matchesArtemisNews', () => {
  describe('positive matches', () => {
    it('matches a plain "artemis" mention', () => {
      expect(
        matchesArtemisNews({ title: "NASA's Artemis II crew returns safely to Earth", summary: null })
      ).toBe(true);
    });

    it('matches "orion" paired with a spacecraft-context term (sls)', () => {
      expect(
        matchesArtemisNews({
          title: 'Orion spacecraft completes SLS stacking milestone at KSC',
          summary: null,
        })
      ).toBe(true);
    });

    it('matches "orion" paired with a spacecraft-context term in the summary, not the title', () => {
      expect(
        matchesArtemisNews({
          title: 'NASA marks major hardware progress',
          summary: 'The Orion capsule was mated to its NASA service module this week.',
        })
      ).toBe(true);
    });

    it('matches "starship hls"', () => {
      expect(
        matchesArtemisNews({
          title: 'SpaceX Starship HLS passes critical design review for lunar lander',
          summary: null,
        })
      ).toBe(true);
    });

    it('matches "blue moon" paired with a program-context term', () => {
      expect(
        matchesArtemisNews({
          title: "Blue Origin's Blue Moon lander achieves propulsion milestone",
          summary: null,
        })
      ).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(matchesArtemisNews({ title: 'ARTEMIS III crew announced', summary: null })).toBe(true);
    });
  });

  describe('negative matches (false-positive guards)', () => {
    it('does NOT match "Orion" used in its astronomy/constellation sense', () => {
      expect(
        matchesArtemisNews({
          title: 'Orion Nebula dazzles astronomers with new deep-space image',
          summary: 'The winter constellation Orion remains a favorite target for skywatchers.',
        })
      ).toBe(false);
    });

    it('does NOT match "blue moon" used in its calendar sense', () => {
      expect(
        matchesArtemisNews({
          title: 'Amateur astronomers spot rare blue moon this weekend',
          summary: 'A blue moon is simply the second full moon in a single calendar month.',
        })
      ).toBe(false);
    });

    it('does NOT match unrelated space news', () => {
      expect(
        matchesArtemisNews({
          title: 'SpaceX launches another batch of Starlink satellites',
          summary: 'The Falcon 9 booster landed on a droneship in the Atlantic.',
        })
      ).toBe(false);
    });

    it('does NOT match a bare "orion" mention with no context term', () => {
      expect(
        matchesArtemisNews({ title: 'Orion, the hunter of Greek mythology', summary: null })
      ).toBe(false);
    });
  });
});

describe('getArtemisNewsArticles', () => {
  it('queries with an OR pre-filter, applies the precise matcher, and slices to the limit', async () => {
    const now = new Date();
    mockPrisma.newsArticle.findMany.mockResolvedValueOnce([
      { id: '1', title: 'Artemis III crew training update', summary: null, url: 'u1', source: 's', category: 'c', imageUrl: null, publishedAt: now },
      { id: '2', title: 'Orion Nebula deep field image released', summary: null, url: 'u2', source: 's', category: 'c', imageUrl: null, publishedAt: now },
      { id: '3', title: 'Orion capsule completes SLS integration', summary: null, url: 'u3', source: 's', category: 'c', imageUrl: null, publishedAt: now },
    ]);

    const result = await getArtemisNewsArticles(2);

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
      { id: '1', title: 'Orion Nebula photographed by amateur astronomer', summary: null, url: 'u1', source: 's', category: 'c', imageUrl: null, publishedAt: new Date() },
    ]);
    const result = await getArtemisNewsArticles(12);
    expect(result).toEqual([]);
  });
});
