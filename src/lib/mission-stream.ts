/**
 * Pure stream-choice derivation helpers for Mission Control's Live Now
 * section and MissionStream.tsx.
 *
 * Why this exists: SpaceX broadcasts launches on X (twitter.com/x.com) and
 * spacex.com — never YouTube. Launch Library 2 (our upstream event feed)
 * frequently still supplies a YouTube `videoUrl` for SpaceX missions that is
 * dead, private, or a stale placeholder, which used to render as a broken
 * "video unavailable" iframe. These helpers are the pure decision logic for:
 *   - which platform a mission's stream actually lives on (resolveStreamSource)
 *   - whether a YouTube link needs verify-before-embed treatment
 *     (isSuspectSpaceXYouTube)
 *   - what watch buttons to offer, in what order (buildWatchButtons)
 *   - which community/creator livestreams are safe to offer as alternates
 *     (selectAlternateFeeds)
 *
 * Kept side-effect-free and framework-free so they're unit-testable without
 * mounting React or hitting the network.
 */

/** Minimal shape of a mission/event needed to derive stream choices. */
export interface StreamChoiceMission {
  agency?: string | null;
  infoUrl?: string | null;
  streamUrl?: string | null;
  videoUrl?: string | null;
  xUrl?: string | null;
}

/** Minimal shape of an alternate community livestream (see ActiveLiveStream
 *  in lib/livestream-detector.ts — duplicated narrowly here, matching the
 *  established pattern in components/landing/LiveStreamSection.tsx, so this
 *  module stays framework/server-free and safe to import from client code). */
export interface AlternateStream {
  videoId: string;
  channelName: string;
  platform: 'youtube' | 'x';
  viewerCount?: number;
  thumbnailUrl?: string;
  watchUrl?: string;
}

export type StreamSource = 'youtube' | 'x' | 'none';

export interface ResolvedStreamSource {
  source: StreamSource;
  youtubeId: string | null;
  xUrl: string | null;
}

export interface WatchButton {
  kind: 'youtube' | 'x' | 'spacex-site' | 'info';
  label: string;
  url: string;
}

const SPACEX_LAUNCHES_URL = 'https://www.spacex.com/launches/';
const SPACEX_X_URL = 'https://x.com/SpaceX';

/** Extract a YouTube video ID from common URL formats. Returns null for
 *  anything else (including X/Twitter URLs). */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

/** True when a URL points at X/Twitter (x.com or twitter.com). */
export function isXUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('x.com') || url.includes('twitter.com');
}

/** True when the mission's agency is SpaceX (case-insensitive substring
 *  match — matches "SpaceX", "Space Exploration Technologies (SpaceX)", etc). */
export function isSpaceXAgency(agency: string | null | undefined): boolean {
  return !!agency && agency.toLowerCase().includes('spacex');
}

/**
 * Decide which platform a mission's stream actually lives on, given the
 * mission's streamUrl/videoUrl/xUrl fields. YouTube is preferred when a
 * valid video ID is present (still attempted even for SpaceX — see
 * isSuspectSpaceXYouTube for why that attempt needs verify-then-embed);
 * otherwise falls back to an X URL from either field; otherwise 'none'.
 */
export function resolveStreamSource(mission: StreamChoiceMission): ResolvedStreamSource {
  const youtubeId = extractYouTubeId(mission.streamUrl || mission.videoUrl);
  if (youtubeId) {
    return { source: 'youtube', youtubeId, xUrl: null };
  }

  const xUrl = isXUrl(mission.streamUrl)
    ? mission.streamUrl!
    : isXUrl(mission.videoUrl)
      ? mission.videoUrl!
      : mission.xUrl || null;

  if (xUrl) {
    return { source: 'x', youtubeId: null, xUrl };
  }

  return { source: 'none', youtubeId: null, xUrl: null };
}

/**
 * SpaceX no longer streams official coverage on YouTube — X and spacex.com
 * are their real broadcast platforms. Launch Library often still supplies a
 * YouTube videoUrl for SpaceX missions that's dead, private, or a stale
 * placeholder, so it should never be embedded blindly. True when a mission
 * is SpaceX-provided AND resolves to a YouTube video id — the signal that
 * should trigger a verify-then-embed check instead of a blind iframe render.
 */
export function isSuspectSpaceXYouTube(mission: StreamChoiceMission): boolean {
  if (!isSpaceXAgency(mission.agency)) return false;
  return extractYouTubeId(mission.streamUrl || mission.videoUrl) !== null;
}

/**
 * Build the ordered list of "watch elsewhere" buttons for a mission.
 * Single source of truth shared by MissionStream's persistent button row and
 * its dead-embed fallback panel (which just filters out the 'youtube' entry
 * — no point offering a YouTube link when YouTube is the thing that failed).
 *
 * Order: YouTube (if a video id resolved) → SpaceX.com + X/@SpaceX (SpaceX
 * missions always get both, since those are their actual platforms) →
 * X/Twitter (non-SpaceX missions whose stream resolved to an X URL) →
 * provider info page (non-SpaceX missions only — SpaceX's is already covered
 * by the SpaceX.com button above, using the same infoUrl).
 */
export function buildWatchButtons(mission: StreamChoiceMission): WatchButton[] {
  const { source, youtubeId, xUrl } = resolveStreamSource(mission);
  const buttons: WatchButton[] = [];
  const spacex = isSpaceXAgency(mission.agency);

  if (source === 'youtube' && youtubeId) {
    buttons.push({
      kind: 'youtube',
      label: 'YouTube',
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
    });
  }

  if (spacex) {
    buttons.push({
      kind: 'spacex-site',
      label: 'Watch on SpaceX.com',
      url: mission.infoUrl || SPACEX_LAUNCHES_URL,
    });
    buttons.push({
      kind: 'x',
      label: 'Watch on X (@SpaceX)',
      url: SPACEX_X_URL,
    });
  } else if (source === 'x' && xUrl) {
    buttons.push({ kind: 'x', label: 'Watch on X', url: xUrl });
  }

  if (mission.infoUrl && !spacex) {
    buttons.push({ kind: 'info', label: 'Mission Details', url: mission.infoUrl });
  }

  return buttons;
}

/**
 * Provider-direct + platform watch options for the dead/absent-embed
 * fallback panel — everything from buildWatchButtons except the YouTube
 * button itself (which is meaningless to offer when YouTube is what failed).
 */
export function getFallbackWatchOptions(mission: StreamChoiceMission): WatchButton[] {
  return buildWatchButtons(mission).filter((button) => button.kind !== 'youtube');
}

/**
 * Alternate community/creator coverage feeds for the "Community coverage"
 * chip row. Only YouTube-platform streams are offered (X streams can't be
 * re-embedded into the player), the currently-active official video is
 * excluded, and results are de-duplicated and capped so the row never
 * overflows the player card.
 */
export function selectAlternateFeeds(
  communityStreams: AlternateStream[] | null | undefined,
  excludeVideoId: string | null,
  limit = 6,
): AlternateStream[] {
  if (!communityStreams || communityStreams.length === 0) return [];

  const seen = new Set<string>();
  const result: AlternateStream[] = [];

  for (const stream of communityStreams) {
    if (stream.platform !== 'youtube') continue;
    if (excludeVideoId && stream.videoId === excludeVideoId) continue;
    if (seen.has(stream.videoId)) continue;
    seen.add(stream.videoId);
    result.push(stream);
    if (result.length >= limit) break;
  }

  return result;
}
