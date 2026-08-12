import { parseXStreamUrl } from '../livestream-detector';

describe('parseXStreamUrl', () => {
  it('parses native X broadcast URLs (how SpaceX streams launches)', () => {
    expect(parseXStreamUrl('https://x.com/i/broadcasts/1DxleVErQBdKL')).toEqual({
      id: '1DxleVErQBdKL',
      handle: null,
    });
  });

  it('parses status URLs with a handle', () => {
    expect(parseXStreamUrl('https://x.com/SpaceX/status/1234567890')).toEqual({
      id: '1234567890',
      handle: 'SpaceX',
    });
  });

  it('parses profile URLs', () => {
    expect(parseXStreamUrl('https://x.com/SpaceX')).toEqual({
      id: 'SpaceX',
      handle: 'SpaceX',
    });
  });

  it('accepts twitter.com and www hosts', () => {
    expect(parseXStreamUrl('https://www.twitter.com/i/broadcasts/abc123')).toEqual({
      id: 'abc123',
      handle: null,
    });
  });

  it('rejects YouTube and other URLs', () => {
    expect(parseXStreamUrl('https://www.youtube.com/watch?v=L6c0OzSQevo')).toBeNull();
    expect(parseXStreamUrl('https://plus.nasa.gov/video/some-stream/')).toBeNull();
    expect(parseXStreamUrl('not a url')).toBeNull();
  });

  it('rejects bare x.com/i paths without a broadcast id', () => {
    expect(parseXStreamUrl('https://x.com/i')).toBeNull();
    expect(parseXStreamUrl('https://x.com/i/broadcasts')).toBeNull();
  });
});
