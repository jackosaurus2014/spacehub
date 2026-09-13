/**
 * The live-mode decision. This is the function that turns /launch/[eventId]
 * into a live page, so every branch is pinned here: before the window, inside
 * it, after it, a detected stream, and each status variant.
 */
import {
  decideLiveMode,
  matchStreamForEvent,
  isObservedStream,
  scoreStreamForEvent,
  launchPageMetadata,
  launchJsonLd,
  liveWindowSentence,
  missionTitle,
  LIVE_WINDOW_AFTER_MS,
  LIVE_WINDOW_BEFORE_MS,
  type DetectedStreamLike,
  type LiveWindowEvent,
} from '@/lib/launch-live-window';

const T0 = new Date('2026-09-14T18:00:00Z');
const at = (offsetMs: number) => new Date(T0.getTime() + offsetMs);

const ev = (over: Partial<LiveWindowEvent> = {}): LiveWindowEvent => ({
  id: 'e1',
  name: 'Falcon 9 Block 5 | Starlink Group 15-30',
  status: 'upcoming',
  launchDate: T0,
  rocket: 'Falcon 9 Block 5',
  agency: 'SpaceX',
  mission: null,
  isLive: false,
  ...over,
});

const stream = (over: Partial<DetectedStreamLike> = {}): DetectedStreamLike => ({
  videoId: 'abc12345678',
  title: 'Starlink Group 15-30 Mission',
  channelName: 'SpaceX',
  watchUrl: 'https://www.youtube.com/watch?v=abc12345678',
  embedUrl: 'https://www.youtube-nocookie.com/embed/abc12345678',
  platform: 'youtube',
  viewerCount: 42_000,
  ...over,
});

describe('decideLiveMode — the window', () => {
  it('is not live an hour and a minute before T-0', () => {
    const d = decideLiveMode(ev(), [], at(-LIVE_WINDOW_BEFORE_MS - 60_000));
    expect(d.live).toBe(false);
    expect(d.reason).toBeNull();
    expect(d.phase).toBe('before');
  });

  it('opens exactly at T-60 minutes', () => {
    const d = decideLiveMode(ev(), [], at(-LIVE_WINDOW_BEFORE_MS));
    expect(d.live).toBe(true);
    expect(d.reason).toBe('window');
    expect(d.phase).toBe('prelaunch');
  });

  it('is live in flight and reports T+ seconds', () => {
    const d = decideLiveMode(ev(), [], at(90_000));
    expect(d.live).toBe(true);
    expect(d.phase).toBe('inflight');
    expect(d.missionTimeSeconds).toBe(90);
  });

  it('closes at T+90 minutes and stays closed after', () => {
    expect(decideLiveMode(ev(), [], at(LIVE_WINDOW_AFTER_MS)).live).toBe(true);
    const after = decideLiveMode(ev(), [], at(LIVE_WINDOW_AFTER_MS + 1000));
    expect(after.live).toBe(false);
    expect(after.phase).toBe('after');
  });

  it('exposes the window bounds for the page and the metadata', () => {
    const d = decideLiveMode(ev(), [], at(0));
    expect(d.opensAt?.toISOString()).toBe('2026-09-14T17:00:00.000Z');
    expect(d.closesAt?.toISOString()).toBe('2026-09-14T19:30:00.000Z');
  });

  it('a launch with no date is never live on the window alone', () => {
    const d = decideLiveMode(ev({ launchDate: null }), [], at(0));
    expect(d.live).toBe(false);
    expect(d.opensAt).toBeNull();
    expect(d.missionTimeSeconds).toBeNull();
  });
});

describe('decideLiveMode — status variants', () => {
  it('in_progress is live regardless of the clock', () => {
    const d = decideLiveMode(ev({ status: 'in_progress' }), [], at(10 * 3600_000));
    expect(d.live).toBe(true);
    expect(d.reason).toBe('status');
  });

  it('"in flight" (spaced) is normalised and counts', () => {
    expect(decideLiveMode(ev({ status: 'In Flight' }), [], at(10 * 3600_000)).reason).toBe('status');
  });

  it('go does NOT make a launch live days ahead — only the window does', () => {
    expect(decideLiveMode(ev({ status: 'go' }), [], at(-3 * 86_400_000)).live).toBe(false);
    expect(decideLiveMode(ev({ status: 'go' }), [], at(-30 * 60_000)).live).toBe(true);
  });

  it('a completed launch keeps the live page through T+90 and loses it after', () => {
    expect(decideLiveMode(ev({ status: 'completed' }), [], at(30 * 60_000)).live).toBe(true);
    expect(decideLiveMode(ev({ status: 'completed' }), [], at(3 * 3600_000)).live).toBe(false);
  });

  it('a scrubbed launch gets no live page even inside the window', () => {
    const d = decideLiveMode(ev({ status: 'scrubbed' }), [], at(-10 * 60_000));
    expect(d.live).toBe(false);
    expect(d.reason).toBeNull();
  });

  it('...unless a stream for it is still on air', () => {
    const d = decideLiveMode(ev({ status: 'scrubbed' }), [stream()], at(-10 * 60_000));
    expect(d.live).toBe(true);
    expect(d.reason).toBe('stream');
  });

  it('the isLive column alone is enough', () => {
    const d = decideLiveMode(ev({ isLive: true }), [], at(-5 * 3600_000));
    expect(d.live).toBe(true);
    expect(d.reason).toBe('flag');
  });
});

describe('decideLiveMode — detected streams', () => {
  it('a matched stream makes the page live hours early', () => {
    const d = decideLiveMode(ev(), [stream()], at(-6 * 3600_000));
    expect(d.live).toBe(true);
    expect(d.reason).toBe('stream');
    expect(d.streamIsLive).toBe(true);
    expect(d.stream?.videoId).toBe('abc12345678');
  });

  it('somebody else’s stream is never borrowed', () => {
    const other = stream({ title: 'Electron | Owl For One', channelName: 'Rocket Lab', videoId: 'zzz11111111' });
    const d = decideLiveMode(ev(), [other], at(-6 * 3600_000));
    expect(d.live).toBe(false);
    expect(d.streamIsLive).toBe(false);
    expect(d.stream).toBeNull();
  });

  it('will not match the wrong flight of the same series', () => {
    // The nightmare case: SpaceX flies Starlink several times a week. A
    // 15-29 webcast must never light up the 15-30 page.
    const wrongFlight = stream({ title: 'Starlink Group 15-29 Mission', videoId: 'wrong1' });
    expect(matchStreamForEvent(ev(), [wrongFlight])).toBeNull();
    // ...and the right one still matches.
    expect(matchStreamForEvent(ev(), [stream()])?.videoId).toBe('abc12345678');
  });

  it('needs more than a single common word from a multi-word mission name', () => {
    const owl = ev({ name: 'Electron | Owl For One', rocket: 'Electron', agency: 'Rocket Lab' });
    expect(matchStreamForEvent(owl, [stream({ title: 'One Small Step', channelName: 'Some Channel' })])).toBeNull();
    expect(matchStreamForEvent(owl, [stream({ title: 'Owl For One | Electron', channelName: 'Rocket Lab' })])).not.toBeNull();
  });

  it('a bare @handle pointer is a link, not evidence of a broadcast', () => {
    // livestream-detector fabricates https://x.com/SpaceX for any imminent
    // SpaceX launch with no webcast URL. It must not light the LIVE badge.
    const pointer = stream({
      platform: 'x',
      videoId: 'x-SpaceX',
      watchUrl: 'https://x.com/SpaceX',
      embedUrl: 'https://x.com/SpaceX',
    });
    expect(isObservedStream(pointer)).toBe(false);
    const d = decideLiveMode(ev(), [pointer], at(-6 * 3600_000));
    expect(d.live).toBe(false);
    expect(d.streamIsLive).toBe(false);
    expect(d.stream?.videoId).toBe('x-SpaceX'); // still offered as a link
  });

  it('a real X broadcast URL is evidence', () => {
    const broadcast = stream({
      platform: 'x',
      videoId: 'x-1abc',
      watchUrl: 'https://x.com/i/broadcasts/1abc',
      embedUrl: 'https://x.com/i/broadcasts/1abc',
    });
    expect(isObservedStream(broadcast)).toBe(true);
    expect(decideLiveMode(ev(), [broadcast], at(-6 * 3600_000)).live).toBe(true);
  });

  it('a scrubbed launch is not resurrected by a pointer', () => {
    const pointer = stream({ platform: 'x', videoId: 'x-SpaceX', watchUrl: 'https://x.com/SpaceX' });
    expect(decideLiveMode(ev({ status: 'scrubbed' }), [pointer], at(-10 * 60_000)).live).toBe(false);
  });

  it('inside the window without a stream, live is true but streamIsLive is false', () => {
    const d = decideLiveMode(ev(), [], at(-20 * 60_000));
    expect(d.live).toBe(true);
    expect(d.streamIsLive).toBe(false);
  });

  it('prefers the embeddable platform at equal evidence', () => {
    const x = stream({ platform: 'x', videoId: 'x1', viewerCount: 999_999 });
    const yt = stream({ platform: 'youtube', videoId: 'y1', viewerCount: 10 });
    expect(matchStreamForEvent(ev(), [x, yt])?.videoId).toBe('y1');
  });

  it('scores a verbatim mission title above a provider-only coincidence', () => {
    const exact = scoreStreamForEvent(ev(), stream());
    const providerOnly = scoreStreamForEvent(ev(), stream({ title: 'SpaceX Falcon 9 Block 5 something else' }));
    expect(exact).toBeGreaterThan(providerOnly);
  });
});

describe('missionTitle', () => {
  it('takes the mission half of an LL2 name', () => {
    expect(missionTitle('Falcon 9 Block 5 | Starlink Group 15-30')).toBe('Starlink Group 15-30');
    expect(missionTitle('Artemis II')).toBe('Artemis II');
  });
});

describe('launchPageMetadata', () => {
  const metaEvent = {
    name: 'Falcon 9 Block 5 | Starlink Group 15-30',
    agency: 'SpaceX',
    rocket: 'Falcon 9 Block 5',
    location: 'Cape Canaveral SFS, FL, USA',
    status: 'upcoming',
    launchDate: T0,
  };

  it('carries LIVE and the mission in live mode', () => {
    const meta = launchPageMetadata(metaEvent, decideLiveMode(ev(), [], at(-10 * 60_000)));
    expect(meta.live).toBe(true);
    expect(meta.title.startsWith('LIVE: Starlink Group 15-30')).toBe(true);
    expect(meta.title).toContain('SpaceNexus');
    expect(meta.ogTitle).toContain('LIVE');
  });

  it('describes the window in live mode', () => {
    const d = decideLiveMode(ev(), [], at(-10 * 60_000));
    const meta = launchPageMetadata(metaEvent, d);
    expect(meta.description).toContain('17:00 UTC to 19:30 UTC');
    expect(liveWindowSentence(d)).toBe('Live coverage runs 17:00 UTC to 19:30 UTC.');
  });

  it('keeps the ordinary title outside the window', () => {
    const meta = launchPageMetadata(metaEvent, decideLiveMode(ev(), [], at(-5 * 86_400_000)));
    expect(meta.live).toBe(false);
    expect(meta.title).toBe('Falcon 9 Block 5 | Starlink Group 15-30 - Launch Day | SpaceNexus');
    expect(meta.outcome).toContain('Launches');
  });

  it('reports the outcome once the launch has flown', () => {
    const flown = { ...metaEvent, status: 'completed' };
    const meta = launchPageMetadata(flown, decideLiveMode(ev({ status: 'completed' }), [], at(5 * 3600_000)));
    expect(meta.outcome).toBe('Launched successfully');
    expect(meta.ogSubtitle).toContain('Launched successfully');
  });

  it('never doubles the SpaceNexus suffix', () => {
    const meta = launchPageMetadata(metaEvent, decideLiveMode(ev(), [], at(-10 * 60_000)));
    expect(meta.title.match(/SpaceNexus/g)).toHaveLength(1);
  });
});

describe('launchJsonLd', () => {
  const jsonEvent = {
    id: 'e1',
    name: 'Falcon 9 Block 5 | Starlink Group 15-30',
    description: 'A Starlink mission.',
    location: 'Cape Canaveral SFS, FL, USA',
    agency: 'SpaceX',
    launchDate: T0,
    imageUrl: null,
  };

  it('is a BroadcastEvent in live mode with the stream as the location', () => {
    const d = decideLiveMode(ev(), [stream()], at(-10 * 60_000));
    const ld = launchJsonLd(jsonEvent, d, 'https://youtu.be/abc12345678');
    expect(ld['@type']).toBe('BroadcastEvent');
    expect(ld.isLiveBroadcast).toBe(true);
    expect((ld.location as Record<string, unknown>).url).toBe('https://youtu.be/abc12345678');
  });

  it('does not claim isLiveBroadcast when no stream was matched', () => {
    const d = decideLiveMode(ev(), [], at(-10 * 60_000));
    expect(launchJsonLd(jsonEvent, d, null).isLiveBroadcast).toBe(false);
  });

  it('is a plain Event outside the window, at the physical pad', () => {
    const d = decideLiveMode(ev(), [], at(-5 * 86_400_000));
    const ld = launchJsonLd(jsonEvent, d, null);
    expect(ld['@type']).toBe('Event');
    expect((ld.location as Record<string, unknown>)['@type']).toBe('Place');
    expect(ld.startDate).toBe(T0.toISOString());
  });
});
