/**
 * @jest-environment node
 */
/**
 * Webinar sources — curated entries must survive an AI refresh.
 *
 * Regression: the webinars API used to replace the curated seed wholesale
 * whenever DynamicContent had any rows. The day the AI refresh started
 * succeeding, ten generated entries silently hid the entire hand-verified
 * conference calendar, including partner sessions announced to us directly.
 */
import { WEBINARS_SEED, mergeWebinarSources } from '../webinar-data';
import type { Webinar } from '@/types';

const asWebinar = (over: Partial<Webinar>): Webinar => ({
  id: 'x',
  slug: 'x',
  title: 'X',
  description: '',
  speaker: '',
  speakerBio: '',
  topic: 'space_policy',
  date: new Date('2026-09-01T00:00:00Z'),
  duration: 60,
  registrationUrl: null,
  recordingUrl: null,
  isLive: false,
  isPast: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('mergeWebinarSources', () => {
  it('keeps every curated entry when generated rows arrive', () => {
    const seed = [asWebinar({ slug: 'curated-a' }), asWebinar({ slug: 'curated-b' })];
    const dynamic = [asWebinar({ slug: 'generated-a' })];
    const { webinars } = mergeWebinarSources(seed, dynamic);
    expect(webinars.map((w) => w.slug)).toEqual(['curated-a', 'curated-b', 'generated-a']);
  });

  it('lets the curated version win a slug collision', () => {
    const seed = [asWebinar({ slug: 'iac-2026', title: 'Curated IAC' })];
    const dynamic = [asWebinar({ slug: 'iac-2026', title: 'Generated IAC' })];
    const { webinars, addedFromDynamic } = mergeWebinarSources(seed, dynamic);
    expect(webinars).toHaveLength(1);
    expect(webinars[0].title).toBe('Curated IAC');
    expect(addedFromDynamic).toBe(0);
  });

  it('reports how many generated rows were actually new', () => {
    const seed = [asWebinar({ slug: 'a' })];
    const dynamic = [asWebinar({ slug: 'a' }), asWebinar({ slug: 'b' }), asWebinar({ slug: 'c' })];
    expect(mergeWebinarSources(seed, dynamic).addedFromDynamic).toBe(2);
  });

  it('keeps a generated row that has no slug rather than dropping it', () => {
    const seed = [asWebinar({ slug: 'a' })];
    const dynamic = [asWebinar({ slug: '' as unknown as string })];
    expect(mergeWebinarSources(seed, dynamic).webinars).toHaveLength(2);
  });

  it('is a no-op when there is nothing generated', () => {
    const seed = [asWebinar({ slug: 'a' })];
    const { webinars, addedFromDynamic } = mergeWebinarSources(seed, []);
    expect(webinars).toHaveLength(1);
    expect(addedFromDynamic).toBe(0);
  });
});

describe('NASA SBIR Ignite Tech Spotlight series', () => {
  const spotlights = WEBINARS_SEED.filter((w) => w.slug.startsWith('nasa-sbir-ignite-'));

  it('carries all three sessions', () => {
    expect(spotlights).toHaveLength(3);
  });

  it('every session links to a real registration page', () => {
    for (const s of spotlights) {
      expect(s.registrationUrl).toMatch(/^https:\/\/luma\.com\/[a-z0-9]+$/);
    }
  });

  it('every session is dated in the announced window and not marked past', () => {
    for (const s of spotlights) {
      const t = new Date(s.date).getTime();
      expect(t).toBeGreaterThanOrEqual(Date.parse('2026-09-01T00:00:00Z'));
      expect(t).toBeLessThan(Date.parse('2026-09-03T00:00:00Z'));
      expect(s.isPast).toBe(false);
    }
  });

  it('uses slugs unique within the seed', () => {
    const slugs = WEBINARS_SEED.map((w) => w.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
