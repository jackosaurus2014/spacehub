/**
 * RSS pacing (2026-09-11): science aggregators are polled at most hourly,
 * a 403/429/DNS failure parks a feed instead of retrying every 5 minutes,
 * and the two dead sources (JPL bot-challenged, Orbital Today gone) are out.
 */
import fs from 'fs';
import path from 'path';
import { rssCooldownMinutesFor, isRssFeedDue, scheduleRssFeed } from '../news-fetcher';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('rss pacing', () => {
  it('cooldowns by failure type', () => {
    expect(rssCooldownMinutesFor('Error: Status code 403')).toBe(360);
    expect(rssCooldownMinutesFor('Error: Status code 429')).toBe(120);
    expect(rssCooldownMinutesFor('Error: getaddrinfo EAI_AGAIN orbitaltoday.com')).toBe(720);
    expect(rssCooldownMinutesFor('Error: timeout of 15000ms exceeded')).toBe(0);
  });
  it('a scheduled feed is not due until its interval has passed', () => {
    const url = 'https://example.com/feed';
    expect(isRssFeedDue(url, 1_000)).toBe(true);
    scheduleRssFeed(url, 60, 1_000);
    expect(isRssFeedDue(url, 1_000 + 59 * 60_000)).toBe(false);
    expect(isRssFeedDue(url, 1_000 + 60 * 60_000)).toBe(true);
  });
  it('sources: no JPL or Orbital Today; science aggregators are paced hourly', () => {
    const src = read('src/lib/news-fetcher.ts');
    expect(src).not.toContain('jpl.nasa.gov/feeds/news');
    expect(src).not.toContain('orbitaltoday.com');
    expect(read('src/lib/blogs-fetcher.ts')).not.toContain('orbitaltoday.com');
    const lines = src.split('\n');
    for (const name of ['Sky & Telescope', 'Phys.org Space', 'ScienceDaily Space', 'ScienceAlert Space']) {
      const line = lines.find((l) => l.includes(`name: '${name}'`));
      expect(line).toBeDefined();
      expect(line).toContain('intervalMinutes: 60');
    }
    expect(src).toContain("name: 'NASA Science', url: 'https://science.nasa.gov/feed/'");
  });
});
