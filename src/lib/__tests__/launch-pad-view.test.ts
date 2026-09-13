/**
 * The pad-view fallback ladder. The rule this pins down is the honest one:
 * padViewIsLive() is true only when an actual stream was chosen.
 */
import {
  choosePadView,
  padViewIsLive,
  padChannelForLocation,
  channelCoversSite,
  PAD_CHANNELS,
  type PadNextLaunch,
  type PadReplay,
} from '@/lib/launch-pad-view';
import type { DetectedStreamLike } from '@/lib/launch-live-window';

const stream = (over: Partial<DetectedStreamLike> = {}): DetectedStreamLike => ({
  videoId: 'v1',
  title: 'Starbase Live',
  channelName: 'Avid Space',
  watchUrl: 'https://www.youtube.com/watch?v=v1',
  embedUrl: 'https://www.youtube-nocookie.com/embed/v1',
  platform: 'youtube',
  viewerCount: 1200,
  ...over,
});

const nextLaunch: PadNextLaunch = {
  id: 'e1',
  name: 'Falcon 9 Block 5 | Starlink Group 15-30',
  launchDate: '2026-09-14T18:00:00.000Z',
  rocket: 'Falcon 9 Block 5',
  location: 'Cape Canaveral SFS, FL, USA',
  agency: 'SpaceX',
  status: 'upcoming',
};

const replay: PadReplay = {
  id: 'e0',
  name: 'Falcon 9 | Starlink Group 15-29',
  launchDate: '2026-09-11T04:00:00.000Z',
  videoUrl: 'https://www.youtube.com/watch?v=old',
};

describe('choosePadView — rung 1: a known pad camera is live', () => {
  it('picks the pad camera and labels it', () => {
    const view = choosePadView({ streams: [stream()], nextLaunch, replay });
    expect(view.kind).toBe('live-pad');
    expect(padViewIsLive(view)).toBe(true);
    expect(view.channel?.id).toBe('labpadre');
    expect(view.what).toContain('Starbase');
  });

  it('prefers the highest-priority channel when two pad cameras are live', () => {
    const view = choosePadView({
      streams: [stream({ channelName: 'NASASpaceflight', videoId: 'nsf' }), stream({ channelName: 'Avid Space', videoId: 'lp' })],
      nextLaunch,
      replay,
    });
    expect(view.kind).toBe('live-pad');
    expect(view.channel?.id).toBe('labpadre');
  });

  it('still shows the next launch and does not bother with the replay', () => {
    const view = choosePadView({ streams: [stream()], nextLaunch, replay });
    expect(view.nextLaunch?.id).toBe('e1');
  });
});

describe('choosePadView — rung 2: some other stream is live', () => {
  it('falls through to the biggest other feed and says what it is', () => {
    const view = choosePadView({
      streams: [stream({ channelName: 'Rocket Lab', videoId: 'rl', viewerCount: 30 }), stream({ channelName: 'ESA', videoId: 'esa', viewerCount: 900 })],
      nextLaunch,
      replay,
    });
    expect(view.kind).toBe('live-other');
    expect(padViewIsLive(view)).toBe(true);
    expect(view.headline).toBe('ESA');
    expect(view.what).toContain('No continuous pad camera is live');
  });

  it('ignores X streams — they cannot be embedded', () => {
    const view = choosePadView({ streams: [stream({ platform: 'x', channelName: 'Rocket Lab' })], nextLaunch, replay });
    expect(view.kind).toBe('scheduled');
    expect(padViewIsLive(view)).toBe(false);
  });
});

describe('choosePadView — rung 3: nothing live', () => {
  it('points at the camera covering the next launch site and keeps the replay', () => {
    const view = choosePadView({ streams: [], nextLaunch, replay });
    expect(view.kind).toBe('scheduled');
    expect(padViewIsLive(view)).toBe(false);
    expect(view.channel?.id).toBe('spaceflightnow');
    expect(view.nextLaunch?.id).toBe('e1');
    expect(view.replay?.id).toBe('e0');
    expect(view.headline).toBe('Nothing is live right now');
  });

  it('falls back to the first channel for an unknown site', () => {
    const view = choosePadView({ streams: [], nextLaunch: { ...nextLaunch, location: 'Jiuquan, China' }, replay });
    expect(view.channel?.id).toBe(PAD_CHANNELS[0].id);
  });
});

describe('choosePadView — rung 4: nothing at all', () => {
  it('says so, and still offers the replay when there is one', () => {
    const view = choosePadView({ streams: [], nextLaunch: null, replay });
    expect(view.kind).toBe('empty');
    expect(padViewIsLive(view)).toBe(false);
    expect(view.nextLaunch).toBeNull();
    expect(view.replay?.id).toBe('e0');
  });

  it('survives a completely empty world', () => {
    const view = choosePadView({ streams: [], nextLaunch: null, replay: null });
    expect(view.kind).toBe('empty');
    expect(view.replay).toBeNull();
    expect(view.what.length).toBeGreaterThan(20);
  });
});

describe('site matching', () => {
  it('matches the Cape by several aliases', () => {
    const sfn = PAD_CHANNELS.find((c) => c.id === 'spaceflightnow')!;
    expect(channelCoversSite(sfn, 'Cape Canaveral SFS, FL, USA')).toBe(true);
    expect(channelCoversSite(sfn, 'Kennedy Space Center, FL, USA')).toBe(true);
    expect(channelCoversSite(sfn, 'Baikonur Cosmodrome')).toBe(false);
    expect(channelCoversSite(sfn, null)).toBe(false);
  });

  it('routes Starbase to a Starbase camera', () => {
    expect(padChannelForLocation('Starbase, TX, USA').site).toContain('Starbase');
  });

  it('every channel has an honest "what you are watching" line', () => {
    for (const c of PAD_CHANNELS) {
      expect(c.what.length).toBeGreaterThan(40);
      expect(c.watchUrl.startsWith('https://')).toBe(true);
    }
  });
});
