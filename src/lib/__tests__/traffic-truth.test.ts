/**
 * @jest-environment node
 */
import {
  cleanPath,
  currentSalt,
  looksAutomated,
  referrerHost,
  utcDay,
  visitorHash,
} from '../traffic-truth';

/**
 * These tests guard a privacy promise, not a feature.
 *
 * The beacon counts every visitor without a consent banner, and that is only
 * defensible because nothing it stores can be linked back to a person or
 * across days. If any of these assertions ever has to be relaxed, the beacon
 * has to move behind the cookie banner at the same time.
 */
describe('traffic-truth: the anonymity construction', () => {
  it('gives the same visitor the same hash within a day', () => {
    const at = new Date('2026-09-17T12:00:00Z');
    const a = visitorHash('203.0.113.7', 'Mozilla/5.0 Chrome', at);
    const b = visitorHash('203.0.113.7', 'Mozilla/5.0 Chrome', at);
    expect(a).toBe(b);
  });

  it('separates two visitors who differ only by user agent', () => {
    const at = new Date('2026-09-17T12:00:00Z');
    expect(visitorHash('203.0.113.7', 'Chrome', at)).not.toBe(
      visitorHash('203.0.113.7', 'Firefox', at)
    );
  });

  it('separates two visitors who differ only by address', () => {
    const at = new Date('2026-09-17T12:00:00Z');
    expect(visitorHash('203.0.113.7', 'Chrome', at)).not.toBe(
      visitorHash('203.0.113.8', 'Chrome', at)
    );
  });

  it('cannot link the same visitor across a day boundary', () => {
    // The salt rotates, so yesterday's hash for a person is unrelated to
    // today's. This is the property that makes the data non-personal: there
    // is no identifier that persists.
    const day1 = visitorHash('203.0.113.7', 'Chrome', new Date('2026-09-17T23:59:00Z'));
    const day2 = visitorHash('203.0.113.7', 'Chrome', new Date('2026-09-18T00:01:00Z'));
    expect(day1).not.toBe(day2);
  });

  it('does not keep the salt on disk or expose it beyond the day', () => {
    const a = currentSalt(new Date('2026-09-17T06:00:00Z'));
    const sameDay = currentSalt(new Date('2026-09-17T18:00:00Z'));
    expect(sameDay.equals(a)).toBe(true);
    const nextDay = currentSalt(new Date('2026-09-18T06:00:00Z'));
    expect(nextDay.equals(a)).toBe(false);
  });

  it('produces a fixed-width digest that carries no plaintext', () => {
    const h = visitorHash('203.0.113.7', 'Mozilla/5.0 Chrome', new Date('2026-09-17T12:00:00Z'));
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).not.toContain('203');
    expect(h.toLowerCase()).not.toContain('chrome');
  });
});

describe('traffic-truth: what reaches the database', () => {
  it('reduces a referrer to a bare host', () => {
    expect(referrerHost('https://www.google.com/search?q=cost+to+launch')).toBe('google.com');
    expect(referrerHost('https://old.reddit.com/r/space/comments/abc/')).toBe('old.reddit.com');
  });

  it('drops our own referrers so internal navigation is not a channel', () => {
    expect(referrerHost('https://spacenexus.us/guide/anything')).toBeNull();
    expect(referrerHost('https://www.spacenexus.us/')).toBeNull();
  });

  it('never returns a referrer query string', () => {
    const host = referrerHost('https://example.com/a?token=secret-value');
    expect(host).toBe('example.com');
    expect(host).not.toContain('secret-value');
  });

  it('survives a malformed referrer', () => {
    expect(referrerHost('not a url')).toBeNull();
    expect(referrerHost('')).toBeNull();
    expect(referrerHost(null)).toBeNull();
  });

  it('strips query strings and fragments from the path', () => {
    // A path query can carry a search term the reader typed, which is theirs.
    expect(cleanPath('/jobs?q=propulsion+engineer&email=a@b.com')).toBe('/jobs');
    expect(cleanPath('/guide/x#section')).toBe('/guide/x');
  });

  it('refuses anything that is not a site-relative path', () => {
    expect(cleanPath('https://evil.example/x')).toBeNull();
    expect(cleanPath('')).toBeNull();
    expect(cleanPath(undefined)).toBeNull();
  });

  it('caps stored lengths', () => {
    expect(cleanPath('/' + 'a'.repeat(500))!.length).toBe(200);
  });
});

describe('traffic-truth: keeping our own traffic out of the number', () => {
  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1)',
    'HeadlessChrome/120.0.0.0',
    'Chrome/120 puppeteer',
    'curl/8.4.0',
    'python-requests/2.31',
  ])('treats %s as automated', (ua) => {
    expect(looksAutomated(ua)).toBe(true);
  });

  it('does not reject a normal browser', () => {
    expect(
      looksAutomated(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
      )
    ).toBe(false);
    expect(
      looksAutomated('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1')
    ).toBe(false);
  });
});

describe('traffic-truth: day bucketing', () => {
  it('buckets to UTC midnight regardless of local time', () => {
    expect(utcDay(new Date('2026-09-17T23:59:59Z')).toISOString()).toBe('2026-09-17T00:00:00.000Z');
    expect(utcDay(new Date('2026-09-18T00:00:01Z')).toISOString()).toBe('2026-09-18T00:00:00.000Z');
  });
});
