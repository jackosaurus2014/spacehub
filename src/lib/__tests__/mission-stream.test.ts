import {
  extractYouTubeId,
  isXUrl,
  isSpaceXAgency,
  resolveStreamSource,
  isSuspectSpaceXYouTube,
  buildWatchButtons,
  getFallbackWatchOptions,
  selectAlternateFeeds,
} from '@/lib/mission-stream';

describe('extractYouTubeId', () => {
  it('parses watch?v= URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
  });

  it('parses youtu.be short URLs', () => {
    expect(extractYouTubeId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
  });

  it('parses embed URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/abcdefghijk')).toBe('abcdefghijk');
  });

  it('parses /live/ URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/live/abcdefghijk')).toBe('abcdefghijk');
  });

  it('returns null for X/Twitter URLs', () => {
    expect(extractYouTubeId('https://x.com/i/broadcasts/1RJjppgNbXwKw')).toBeNull();
  });

  it('returns null for null/undefined/empty input', () => {
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
    expect(extractYouTubeId('')).toBeNull();
  });
});

describe('isXUrl', () => {
  it('detects x.com and twitter.com', () => {
    expect(isXUrl('https://x.com/SpaceX')).toBe(true);
    expect(isXUrl('https://twitter.com/SpaceX')).toBe(true);
  });

  it('rejects other hosts', () => {
    expect(isXUrl('https://www.youtube.com/watch?v=abcdefghijk')).toBe(false);
    expect(isXUrl(null)).toBe(false);
  });
});

describe('isSpaceXAgency', () => {
  it('matches case-insensitively', () => {
    expect(isSpaceXAgency('SpaceX')).toBe(true);
    expect(isSpaceXAgency('spacex')).toBe(true);
    expect(isSpaceXAgency('Space Exploration Technologies (SpaceX)')).toBe(true);
  });

  it('does not match other agencies', () => {
    expect(isSpaceXAgency('NASA')).toBe(false);
    expect(isSpaceXAgency(null)).toBe(false);
    expect(isSpaceXAgency(undefined)).toBe(false);
  });
});

describe('resolveStreamSource', () => {
  it('prefers a resolvable YouTube id when present', () => {
    const result = resolveStreamSource({
      streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      xUrl: 'https://x.com/SpaceX',
    });
    expect(result).toEqual({ source: 'youtube', youtubeId: 'abcdefghijk', xUrl: null });
  });

  it('falls back to videoUrl when streamUrl has no video id', () => {
    const result = resolveStreamSource({
      streamUrl: null,
      videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    });
    expect(result.source).toBe('youtube');
    expect(result.youtubeId).toBe('abcdefghijk');
  });

  it('resolves an X broadcast URL from streamUrl', () => {
    const result = resolveStreamSource({
      streamUrl: 'https://x.com/i/broadcasts/1RJjppgNbXwKw',
    });
    expect(result).toEqual({
      source: 'x',
      youtubeId: null,
      xUrl: 'https://x.com/i/broadcasts/1RJjppgNbXwKw',
    });
  });

  it('resolves an X URL from videoUrl (the real prod shape for several SpaceX rows)', () => {
    const result = resolveStreamSource({
      videoUrl: 'https://x.com/i/broadcasts/1qKDzWPePyaJV',
    });
    expect(result.source).toBe('x');
    expect(result.xUrl).toBe('https://x.com/i/broadcasts/1qKDzWPePyaJV');
  });

  it('falls back to the xUrl field when neither streamUrl nor videoUrl is an X link', () => {
    const result = resolveStreamSource({ xUrl: 'https://x.com/SpaceX' });
    expect(result.source).toBe('x');
    expect(result.xUrl).toBe('https://x.com/SpaceX');
  });

  it('returns none when no usable URL is present', () => {
    const result = resolveStreamSource({});
    expect(result).toEqual({ source: 'none', youtubeId: null, xUrl: null });
  });
});

describe('isSuspectSpaceXYouTube', () => {
  it('is true for a SpaceX mission with a YouTube video url (the real prod shape for near-term launches)', () => {
    expect(
      isSuspectSpaceXYouTube({
        agency: 'SpaceX',
        videoUrl: 'https://www.youtube.com/watch?v=kHEJHhUndgk',
      }),
    ).toBe(true);
  });

  it('is false for a SpaceX mission already on X', () => {
    expect(
      isSuspectSpaceXYouTube({
        agency: 'SpaceX',
        videoUrl: 'https://x.com/i/broadcasts/1RJjppgNbXwKw',
      }),
    ).toBe(false);
  });

  it('is false for a non-SpaceX mission with a YouTube video url', () => {
    expect(
      isSuspectSpaceXYouTube({
        agency: 'NASA',
        videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      }),
    ).toBe(false);
  });

  it('is false when there is no video url at all', () => {
    expect(isSuspectSpaceXYouTube({ agency: 'SpaceX' })).toBe(false);
  });
});

describe('buildWatchButtons', () => {
  it('SpaceX + YouTube: offers YouTube, SpaceX.com (mission infoUrl), and X — in that order', () => {
    const buttons = buildWatchButtons({
      agency: 'SpaceX',
      videoUrl: 'https://www.youtube.com/watch?v=kHEJHhUndgk',
      infoUrl: 'https://www.spacex.com/launches/ussf366',
    });
    expect(buttons.map((b) => b.kind)).toEqual(['youtube', 'spacex-site', 'x']);
    expect(buttons[0].url).toBe('https://www.youtube.com/watch?v=kHEJHhUndgk');
    expect(buttons[1].url).toBe('https://www.spacex.com/launches/ussf366');
    expect(buttons[2].url).toBe('https://x.com/SpaceX');
  });

  it('SpaceX with no infoUrl falls back to the generic SpaceX launches page', () => {
    const buttons = buildWatchButtons({ agency: 'SpaceX', videoUrl: 'https://x.com/i/broadcasts/abc' });
    const spacexSite = buttons.find((b) => b.kind === 'spacex-site');
    expect(spacexSite?.url).toBe('https://www.spacex.com/launches/');
  });

  it('SpaceX never gets a duplicate generic info button (SpaceX.com already covers infoUrl)', () => {
    const buttons = buildWatchButtons({
      agency: 'SpaceX',
      infoUrl: 'https://www.spacex.com/launches/ussf366',
    });
    expect(buttons.filter((b) => b.kind === 'info')).toHaveLength(0);
  });

  it('non-SpaceX with an X stream offers a plain X button, no SpaceX buttons', () => {
    const buttons = buildWatchButtons({
      agency: 'Rocket Lab',
      streamUrl: 'https://x.com/RocketLab',
      infoUrl: 'https://www.rocketlabusa.com/launch',
    });
    expect(buttons.map((b) => b.kind)).toEqual(['x', 'info']);
    expect(buttons[0].url).toBe('https://x.com/RocketLab');
  });

  it('non-SpaceX with only an infoUrl offers just the info button', () => {
    const buttons = buildWatchButtons({ agency: 'NASA', infoUrl: 'https://nasa.gov/launch' });
    expect(buttons).toEqual([{ kind: 'info', label: 'Mission Details', url: 'https://nasa.gov/launch' }]);
  });

  it('returns an empty list when nothing is resolvable', () => {
    expect(buildWatchButtons({ agency: 'Unknown Provider' })).toEqual([]);
  });
});

describe('getFallbackWatchOptions', () => {
  it('strips the YouTube button but keeps SpaceX.com + X for a suspect SpaceX mission', () => {
    const options = getFallbackWatchOptions({
      agency: 'SpaceX',
      videoUrl: 'https://www.youtube.com/watch?v=kHEJHhUndgk',
      infoUrl: 'https://www.spacex.com/launches/ussf366',
    });
    expect(options.map((b) => b.kind)).toEqual(['spacex-site', 'x']);
  });

  it('is identical to buildWatchButtons when there was never a YouTube option', () => {
    const mission = { agency: 'NASA', infoUrl: 'https://nasa.gov/launch' };
    expect(getFallbackWatchOptions(mission)).toEqual(buildWatchButtons(mission));
  });
});

describe('selectAlternateFeeds', () => {
  const streams = [
    { videoId: 'yt1', channelName: 'NASASpaceflight', platform: 'youtube' as const, viewerCount: 500 },
    { videoId: 'yt2', channelName: 'Everyday Astronaut', platform: 'youtube' as const, viewerCount: 200 },
    { videoId: 'x1', channelName: 'SpaceX', platform: 'x' as const, viewerCount: 0 },
    { videoId: 'yt1', channelName: 'NASASpaceflight (dupe)', platform: 'youtube' as const, viewerCount: 500 },
  ];

  it('keeps only YouTube-platform streams (X cannot be re-embedded)', () => {
    const result = selectAlternateFeeds(streams, null);
    expect(result.map((s) => s.videoId)).toEqual(['yt1', 'yt2']);
  });

  it('excludes the currently-active official video id', () => {
    const result = selectAlternateFeeds(streams, 'yt1');
    expect(result.map((s) => s.videoId)).toEqual(['yt2']);
  });

  it('de-duplicates by videoId', () => {
    const result = selectAlternateFeeds(streams, null);
    expect(result.filter((s) => s.videoId === 'yt1')).toHaveLength(1);
  });

  it('caps results to the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      videoId: `yt${i}`,
      channelName: `Channel ${i}`,
      platform: 'youtube' as const,
      viewerCount: i,
    }));
    expect(selectAlternateFeeds(many, null, 3)).toHaveLength(3);
  });

  it('returns an empty array for null/undefined/empty input', () => {
    expect(selectAlternateFeeds(null, null)).toEqual([]);
    expect(selectAlternateFeeds(undefined, null)).toEqual([]);
    expect(selectAlternateFeeds([], null)).toEqual([]);
  });
});
