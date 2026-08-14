/**
 * Tests for src/lib/podcast-roster.ts — the verified podcast roster used by
 * scripts/seed-podcasts.ts. Pure shape validation only (no network/DB).
 */

import { PODCAST_ROSTER, validateRoster, SeedPodcast } from '@/lib/podcast-roster';
import { PODCAST_CATEGORIES } from '@/lib/validations';

describe('PODCAST_ROSTER', () => {
  it('is non-empty', () => {
    expect(PODCAST_ROSTER.length).toBeGreaterThan(0);
  });

  it('passes its own shape validator', () => {
    const result = validateRoster(PODCAST_ROSTER);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has no duplicate show names', () => {
    const names = PODCAST_ROSTER.map((s) => s.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('every feedUrl and websiteUrl is a well-formed http(s) URL', () => {
    for (const show of PODCAST_ROSTER) {
      expect(show.feedUrl).toMatch(/^https?:\/\/.+/i);
      expect(show.websiteUrl).toMatch(/^https?:\/\/.+/i);
    }
  });

  it('every category is a known PODCAST_CATEGORIES value', () => {
    for (const show of PODCAST_ROSTER) {
      expect(PODCAST_CATEGORIES).toContain(show.category);
    }
  });

  it('includes at least one AI-category show and at least one space show', () => {
    const categories = new Set(PODCAST_ROSTER.map((s) => s.category));
    expect(categories.has('ai')).toBe(true);
    const nonAiCount = PODCAST_ROSTER.filter((s) => s.category !== 'ai').length;
    expect(nonAiCount).toBeGreaterThan(0);
  });
});

describe('validateRoster', () => {
  const BASE: SeedPodcast = {
    name: 'Example Show',
    description: 'A show about testing validators.',
    feedUrl: 'https://example.com/rss',
    websiteUrl: 'https://example.com',
    author: 'Test Author',
    category: 'general',
  };

  it('accepts a well-formed roster', () => {
    const result = validateRoster([BASE]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags a duplicate name', () => {
    const result = validateRoster([BASE, { ...BASE }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate show name'))).toBe(true);
  });

  it('flags a non-http feedUrl', () => {
    const result = validateRoster([{ ...BASE, feedUrl: 'not-a-url' }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('feedUrl'))).toBe(true);
  });

  it('flags an unknown category', () => {
    const result = validateRoster([{ ...BASE, category: 'not-a-category' as SeedPodcast['category'] }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not in PODCAST_CATEGORIES'))).toBe(true);
  });

  it('flags a missing/too-short description', () => {
    const result = validateRoster([{ ...BASE, description: 'short' }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('description'))).toBe(true);
  });
});
