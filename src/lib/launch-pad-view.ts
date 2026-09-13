/**
 * The 24/7 pad view (/live/pad).
 *
 * Spaceflight Now's "Launch Pad Live" and NSF's Starbase cameras are why
 * enthusiasts park a tab on those sites. We already detect live streams; this
 * module picks WHICH one to park a viewer on, and — crucially — what to show
 * when nothing is live, without ever pretending something is.
 *
 * The ladder (choosePadView):
 *   1. live-pad   — a detected live stream from a known continuous pad camera.
 *   2. live-other — any other detected live stream (a mission webcast).
 *   3. scheduled  — nothing live: the pad channel's home, the next scheduled
 *                   launch from the biggest site, and the most recent replay.
 *   4. empty      — no streams, no schedule, no replay. Says exactly that.
 *
 * Everything here is pure; the page does the I/O.
 */

import type { DetectedStreamLike } from './launch-live-window';

export interface PadChannel {
  id: string;
  /** Display name of the camera/feed. */
  name: string;
  /** channelName as the livestream detector reports it. */
  channelName: string;
  /** Where a viewer goes to watch on the source platform. */
  watchUrl: string;
  /** Launch site this camera overlooks, matched against SpaceEvent.location. */
  site: string;
  /** Substrings that identify that site in a location string. */
  siteMatches: string[];
  /** One honest line: what you are looking at. */
  what: string;
}

/**
 * Continuous / near-continuous pad cameras, best first. Channel names must
 * match what livestream-detector reports (SPACE_CHANNELS `name`), because
 * that is the only field a detected stream carries back.
 */
export const PAD_CHANNELS: PadChannel[] = [
  {
    id: 'labpadre',
    name: 'LabPadre',
    channelName: 'Avid Space',
    watchUrl: 'https://www.youtube.com/@LabPadre/streams',
    site: 'Starbase, TX · Port Canaveral, FL',
    siteMatches: ['starbase', 'boca chica', 'port canaveral'],
    what: 'LabPadre’s remote cameras: SpaceX’s Starbase pads in Boca Chica, Texas and the recovery fleet at Port Canaveral, Florida. They run around the clock, and most of the time nothing is moving.',
  },
  {
    id: 'nsf',
    name: 'NASASpaceflight — Starbase Live',
    channelName: 'NASASpaceflight',
    watchUrl: 'https://www.youtube.com/@NASASpaceflight/streams',
    site: 'Starbase, TX',
    siteMatches: ['starbase', 'boca chica'],
    what: 'NASASpaceflight’s tracking cameras and commentary from Starbase, plus live coverage of major launches elsewhere.',
  },
  {
    id: 'spaceflightnow',
    name: 'Spaceflight Now',
    channelName: 'Spaceflight Now',
    watchUrl: 'https://www.youtube.com/@SpaceflightNowVideo/streams',
    site: 'Cape Canaveral SFS, FL, USA',
    siteMatches: ['cape canaveral', 'kennedy', 'ksc', 'florida'],
    what: 'Spaceflight Now’s pad and range coverage from Florida’s Space Coast, live for most Cape launches.',
  },
  {
    id: 'nasa',
    name: 'NASA TV',
    channelName: 'NASA',
    watchUrl: 'https://www.youtube.com/@NASA/streams',
    site: 'Kennedy Space Center, FL, USA',
    siteMatches: ['kennedy', 'ksc', 'cape canaveral', 'wallops'],
    what: 'NASA’s public channel — mission coverage, ISS views and agency briefings rather than a fixed pad camera.',
  },
];

export interface PadNextLaunch {
  id: string;
  name: string;
  launchDate: string | null; // ISO
  rocket: string | null;
  location: string | null;
  agency: string | null;
  status: string;
}

export interface PadReplay {
  id: string;
  name: string;
  launchDate: string | null; // ISO
  /** YouTube (or provider) URL for the recording. */
  videoUrl: string;
}

export type PadView =
  | { kind: 'live-pad'; stream: DetectedStreamLike; channel: PadChannel; headline: string; what: string; nextLaunch: PadNextLaunch | null; replay: PadReplay | null }
  | { kind: 'live-other'; stream: DetectedStreamLike; channel: null; headline: string; what: string; nextLaunch: PadNextLaunch | null; replay: PadReplay | null }
  | { kind: 'scheduled'; stream: null; channel: PadChannel; headline: string; what: string; nextLaunch: PadNextLaunch | null; replay: PadReplay | null }
  | { kind: 'empty'; stream: null; channel: null; headline: string; what: string; nextLaunch: null; replay: PadReplay | null };

/** Is this location one of the sites the channel overlooks? */
export function channelCoversSite(channel: PadChannel, location: string | null | undefined): boolean {
  if (!location) return false;
  const l = location.toLowerCase();
  return channel.siteMatches.some((m) => l.includes(m));
}

/** The pad channel whose site matches this launch, else the first channel. */
export function padChannelForLocation(location: string | null | undefined): PadChannel {
  return PAD_CHANNELS.find((c) => channelCoversSite(c, location)) ?? PAD_CHANNELS[0];
}

export interface PadViewInput {
  streams: readonly DetectedStreamLike[];
  nextLaunch: PadNextLaunch | null;
  replay: PadReplay | null;
}

export function choosePadView({ streams, nextLaunch, replay }: PadViewInput): PadView {
  // Only embeddable streams can be a pad view; an X stream is a link, not a feed.
  const embeddable = streams.filter((s) => s.platform === 'youtube' && !!s.embedUrl);

  // 1. A known continuous pad camera is live.
  for (const channel of PAD_CHANNELS) {
    const match = embeddable
      .filter((s) => s.channelName.toLowerCase() === channel.channelName.toLowerCase())
      .sort((a, b) => b.viewerCount - a.viewerCount)[0];
    if (match) {
      return {
        kind: 'live-pad',
        stream: match,
        channel,
        // The stream's own title is the most honest headline: it says what is
        // actually on air, which is not always the camera the channel is
        // best known for.
        headline: match.title || channel.name,
        what: `${channel.name} — ${channel.what}`,
        nextLaunch,
        replay,
      };
    }
  }

  // 2. Something else is live — a mission webcast. Honest about what it is.
  const other = [...embeddable].sort((a, b) => b.viewerCount - a.viewerCount)[0];
  if (other) {
    return {
      kind: 'live-other',
      stream: other,
      channel: null,
      headline: other.channelName,
      what: `No continuous pad camera is live right now. This is ${other.channelName}’s stream, the biggest space feed currently on air.`,
      nextLaunch,
      replay,
    };
  }

  // 3. Nothing live. Point at the channel that covers the next launch's site.
  if (nextLaunch) {
    const channel = padChannelForLocation(nextLaunch.location);
    return {
      kind: 'scheduled',
      stream: null,
      channel,
      headline: `Nothing is live right now`,
      what: `${channel.name} is the camera that usually covers ${nextLaunch.location ?? channel.site}. It is off air at the moment — the next launch from there is below.`,
      nextLaunch,
      replay,
    };
  }

  // 4. Nothing at all.
  return {
    kind: 'empty',
    stream: null,
    channel: null,
    headline: 'Nothing is live right now',
    what: 'No pad camera is on air and we have no scheduled launch to point you at. The most recent replay we know of is below.',
    nextLaunch: null,
    replay,
  };
}

/** True when the view is genuinely a live feed — gates every LIVE badge. */
export function padViewIsLive(view: PadView): boolean {
  return view.kind === 'live-pad' || view.kind === 'live-other';
}
