/**
 * @jest-environment node
 */
import { buildArchiveLine, shapeArchiveHeadlines, type RawNewsArticle } from '../archive-feed';
import { LORE_YEAR_OFFSET } from '../lore-year';

describe('buildArchiveLine', () => {
  it('formats "{N} years ago today: {headline}"', () => {
    expect(buildArchiveLine('SpaceX launches Starship Flight 14', 124)).toBe(
      '124 years ago today: SpaceX launches Starship Flight 14'
    );
  });

  it('rounds fractional offsets and never goes negative', () => {
    expect(buildArchiveLine('Headline', 12.6)).toBe('13 years ago today: Headline');
    expect(buildArchiveLine('Headline', -5)).toBe('0 years ago today: Headline');
  });
});

describe('shapeArchiveHeadlines', () => {
  const article = (over: Partial<RawNewsArticle> = {}): RawNewsArticle => ({
    id: 'a1',
    title: 'NASA confirms new lunar contract',
    url: 'https://example.com/article',
    publishedAt: '2026-08-14T00:00:00Z',
    ...over,
  });

  it('shapes a valid article into a ticker entry using the default lore offset', () => {
    const [entry] = shapeArchiveHeadlines([article()]);
    expect(entry.title).toBe('NASA confirms new lunar contract');
    expect(entry.href).toBe('https://example.com/article');
    expect(entry.archiveLine).toBe(`${LORE_YEAR_OFFSET} years ago today: NASA confirms new lunar contract`);
  });

  it('respects a custom yearsAgo override', () => {
    const [entry] = shapeArchiveHeadlines([article()], { yearsAgo: 50 });
    expect(entry.archiveLine).toBe('50 years ago today: NASA confirms new lunar contract');
  });

  it('drops entries missing a title or a url', () => {
    const shaped = shapeArchiveHeadlines([
      article({ title: '' }),
      article({ url: null }),
      article({ id: 'ok' }),
    ]);
    expect(shaped).toHaveLength(1);
    expect(shaped[0].id).toBe('ok');
  });

  it('falls back to the href as the id when no id is present', () => {
    const [entry] = shapeArchiveHeadlines([article({ id: undefined })]);
    expect(entry.id).toBe('https://example.com/article');
  });

  it('respects the limit option', () => {
    const shaped = shapeArchiveHeadlines(
      [article({ id: '1' }), article({ id: '2' }), article({ id: '3' })],
      { limit: 2 }
    );
    expect(shaped).toHaveLength(2);
  });

  it('returns an empty array for null, undefined, or non-array input', () => {
    expect(shapeArchiveHeadlines(null)).toEqual([]);
    expect(shapeArchiveHeadlines(undefined)).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(shapeArchiveHeadlines({} as any)).toEqual([]);
  });

  it('carries publishedAt through, defaulting to null when absent/invalid', () => {
    const [entry] = shapeArchiveHeadlines([article({ publishedAt: undefined })]);
    expect(entry.publishedAt).toBeNull();
  });
});
