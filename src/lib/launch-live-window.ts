/**
 * Launch live mode — the single, pure decision behind "is /launch/[eventId]
 * a live page right now?"
 *
 * Why a function and not scattered conditionals (2026-09-13, Tier 2 #6):
 * before this, "live" was decided independently by MissionHeader
 * (missionState), LaunchDayDashboard (a T-5m..T+2h client timer),
 * /api/livestreams/active (T-30m..T+90m) and the isLive column. Four answers,
 * none testable. Everything that flips the page into live mode now goes
 * through decideLiveMode(), which is pure, takes `now`, and is tested.
 *
 * House rule that outranks everything here: NEVER claim live when it is not.
 * `decision.live` only means "show the live layout". A LIVE badge is gated on
 * `decision.streamIsLive`, which is true only when a detected stream was
 * matched to this specific launch.
 */

export const LIVE_WINDOW_BEFORE_MS = 60 * 60_000; // T−60 min
export const LIVE_WINDOW_AFTER_MS = 90 * 60_000; // T+90 min

/**
 * Statuses that mean the vehicle is flying right now. `go` is deliberately
 * NOT here: LL2 sets "Go for Launch" days ahead, so treating it as live would
 * put every scheduled launch in live mode. A `go` launch enters live mode the
 * normal way — by crossing T−60 min.
 */
const IN_FLIGHT_STATUSES = new Set(['in_progress', 'in-progress', 'in flight', 'in_flight', 'live', 'launching', 'liftoff']);

/** Statuses where the broadcast is over or never started. */
const STOOD_DOWN_STATUSES = new Set(['scrubbed', 'cancelled', 'canceled', 'postponed', 'hold_indefinite']);

/** Statuses where the vehicle has flown (coverage continues to T+90). */
const FLOWN_STATUSES = new Set(['completed', 'failed', 'failure', 'partial_failure']);

export interface LiveWindowEvent {
  id: string;
  name: string;
  status: string;
  launchDate: Date | string | null;
  isLive?: boolean | null;
  rocket?: string | null;
  mission?: string | null;
  agency?: string | null;
}

/** The subset of ActiveLiveStream (src/lib/livestream-detector.ts) this module needs. */
export interface DetectedStreamLike {
  videoId: string;
  title: string;
  channelName: string;
  watchUrl: string;
  embedUrl: string;
  platform: 'youtube' | 'x';
  viewerCount: number;
}

export type LiveReason = 'stream' | 'status' | 'flag' | 'window' | null;
export type LivePhase = 'before' | 'prelaunch' | 'inflight' | 'after';

export interface LiveModeDecision {
  /** Render the live layout. */
  live: boolean;
  /** Why — the first rule that fired, strongest first. */
  reason: LiveReason;
  phase: LivePhase;
  /** T−60 min / T+90 min, null when the launch has no date. */
  opensAt: Date | null;
  closesAt: Date | null;
  /** A detected stream matched to THIS launch, or null. */
  stream: DetectedStreamLike | null;
  /** True only when `stream` is a real, currently-detected live stream. */
  streamIsLive: boolean;
  /** Seconds relative to T−0 (negative before liftoff); null without a date. */
  missionTimeSeconds: number | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normStatus(status: string | null | undefined): string {
  return (status ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

// ── Stream ↔ launch matching ───────────────────────────────────────────────

/** Words that carry no identifying signal in a webcast title. */
const STOP_TOKENS = new Set([
  'live', 'launch', 'launches', 'mission', 'watch', 'stream', 'webcast', 'coverage', 'official',
  'the', 'and', 'for', 'from', 'with', 'group', 'flight', 'rocket', 'space', 'block', 'test',
]);

/** "Starlink 12-8" from "Falcon 9 Block 5 | Starlink 12-8". */
export function missionTitle(name: string): string {
  const parts = name.split(' | ');
  return (parts.length > 1 ? parts[parts.length - 1] : name).trim();
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokensOf(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t));
}

/**
 * Score a detected stream against a launch. 0 means "no evidence"; the caller
 * requires a positive score, so an unmatched launch never borrows somebody
 * else's stream.
 */
export function scoreStreamForEvent(event: LiveWindowEvent, stream: DetectedStreamLike): number {
  const haystack = normalize(`${stream.title} ${stream.channelName}`);
  if (!haystack) return 0;

  const mission = missionTitle(event.name);
  const missionNorm = normalize(event.mission || mission);
  let score = 0;

  // Strongest: the full mission designation appears verbatim in the title.
  if (missionNorm.length >= 5 && haystack.includes(missionNorm)) score += 10;

  // Token evidence. Matching is on whole tokens, not substrings, and the
  // numeric designator is treated as the discriminator: "Starlink Group 15-30"
  // and "Starlink Group 15-29" share every word, so a flight number that does
  // NOT appear in the title disqualifies the stream outright. Without that,
  // any Starlink webcast would light up every Starlink launch page.
  const hayTokens = new Set(haystack.split(' '));
  const allTokens = normalize(event.mission || mission).split(' ').filter(Boolean);
  const numerics = allTokens.filter((t) => /^\d+$/.test(t));
  const words = allTokens.filter((t) => t.length >= 3 && !STOP_TOKENS.has(t) && !/^\d+$/.test(t));
  const numericsOk = numerics.every((t) => hayTokens.has(t));
  const wordHits = words.filter((t) => hayTokens.has(t)).length;
  const strongTokens =
    numericsOk &&
    (numerics.length > 0
      ? wordHits >= 1 // a flight number plus at least one name word
      : words.length >= 2
        ? wordHits >= 2 // a multi-word name needs two of them
        : words.length === 1 && words[0].length >= 6 && wordHits === 1); // one distinctive word
  if (strongTokens) score += 5;

  // Provider agreement is corroboration, never proof on its own.
  const agency = normalize(event.agency ?? '');
  const agencyMatch = agency.length >= 3 && haystack.includes(agency);
  const rocketTokens = tokensOf(event.rocket ?? '');
  const rocketMatch = rocketTokens.length > 0 && rocketTokens.every((t) => hayTokens.has(t));
  if (agencyMatch && rocketMatch) score += 4;
  else if (agencyMatch && score > 0) score += 2;
  else if (rocketMatch && score > 0) score += 1;

  return score;
}

/**
 * A bare X profile link (`https://x.com/SpaceX`) is a POINTER, not a
 * broadcast. livestream-detector synthesises one for any imminent SpaceX
 * launch with no webcast URL ("point viewers at @SpaceX"), which would
 * otherwise light the LIVE badge on every SpaceX launch page an hour early.
 * A /status/, /i/broadcasts/ or /i/spaces/ URL is a real broadcast.
 */
const X_PROFILE_ONLY = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?$/i;

/** True when the stream is an observed broadcast rather than a placeholder link. */
export function isObservedStream(stream: DetectedStreamLike): boolean {
  if (stream.platform !== 'x') return true;
  return !X_PROFILE_ONLY.test((stream.watchUrl || '').trim());
}

/** The best detected stream for this launch, or null when none is convincing. */
export function matchStreamForEvent(
  event: LiveWindowEvent,
  streams: readonly DetectedStreamLike[],
): DetectedStreamLike | null {
  let best: DetectedStreamLike | null = null;
  let bestScore = 0;
  for (const s of streams) {
    const score = scoreStreamForEvent(event, s);
    if (score < 3) continue;
    // Prefer a higher score, then an embeddable platform, then audience.
    const better =
      score > bestScore ||
      (score === bestScore && best !== null && !isObservedStream(best) && isObservedStream(s)) ||
      (score === bestScore && best !== null && best.platform !== 'youtube' && s.platform === 'youtube') ||
      (score === bestScore && best !== null && best.platform === s.platform && s.viewerCount > best.viewerCount);
    if (best === null || better) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

// ── The decision ───────────────────────────────────────────────────────────

export function decideLiveMode(
  event: LiveWindowEvent,
  streams: readonly DetectedStreamLike[] = [],
  now: Date = new Date(),
): LiveModeDecision {
  const t0 = toDate(event.launchDate);
  const status = normStatus(event.status);
  const opensAt = t0 ? new Date(t0.getTime() - LIVE_WINDOW_BEFORE_MS) : null;
  const closesAt = t0 ? new Date(t0.getTime() + LIVE_WINDOW_AFTER_MS) : null;
  const missionTimeSeconds = t0 ? (now.getTime() - t0.getTime()) / 1000 : null;

  let phase: LivePhase = 'before';
  if (t0) {
    if (now.getTime() < opensAt!.getTime()) phase = 'before';
    else if (now.getTime() < t0.getTime()) phase = 'prelaunch';
    else if (now.getTime() <= closesAt!.getTime()) phase = 'inflight';
    else phase = 'after';
  }

  const stream = matchStreamForEvent(event, streams);
  // A placeholder pointer keeps its place as a link but is never evidence.
  const streamIsLive = stream !== null && isObservedStream(stream);

  const base = { phase, opensAt, closesAt, stream, streamIsLive, missionTimeSeconds };

  // 1. A stream we matched to this launch is live. Strongest evidence there is.
  if (streamIsLive) return { ...base, live: true, reason: 'stream' };

  // 2. The vehicle is flying, per the upstream status field.
  if (IN_FLIGHT_STATUSES.has(status)) return { ...base, live: true, reason: 'status' };

  // 3. The sync marked the event live (webcast flag from the provider feed).
  if (event.isLive === true) return { ...base, live: true, reason: 'flag' };

  // 4. A stood-down launch has no live page — no window, no clock, no promise.
  if (STOOD_DOWN_STATUSES.has(status)) return { ...base, live: false, reason: null };

  // 5. Inside T−60 … T+90. A flown launch keeps the live page through T+90 so
  //    the post-launch minutes (deploy, landing, recap) stay on one URL.
  const inWindow = t0 !== null && now >= opensAt! && now <= closesAt!;
  if (inWindow) return { ...base, live: true, reason: 'window' };

  return { ...base, live: false, reason: null };
}

// ── Metadata composition ───────────────────────────────────────────────────

export interface LaunchMetaEvent {
  name: string;
  agency?: string | null;
  rocket?: string | null;
  location?: string | null;
  status: string;
  launchDate: Date | string | null;
}

export interface LaunchMetaParts {
  title: string;
  description: string;
  ogTitle: string;
  ogSubtitle: string;
  /** The human outcome phrase used in the OG card and description. */
  outcome: string;
  /** True when the title carries LIVE. */
  live: boolean;
}

export function formatUtc(d: Date | null): string {
  if (!d) return 'date TBD';
  return (
    d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
    }) + ' UTC'
  );
}

/** "T−60 min to T+90 min around 13:45 UTC" — the window, in words. */
export function liveWindowSentence(decision: LiveModeDecision): string {
  if (!decision.opensAt || !decision.closesAt) return 'Live coverage is running now.';
  const hhmm = (d: Date) =>
    d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
  return `Live coverage runs ${hhmm(decision.opensAt)} to ${hhmm(decision.closesAt)}.`;
}

/**
 * The per-launch title/description, in both modes. Pure so the SEO copy can be
 * asserted without booting Next's metadata machinery.
 */
export function launchPageMetadata(event: LaunchMetaEvent, decision: LiveModeDecision): LaunchMetaParts {
  const t0 = toDate(event.launchDate);
  const status = normStatus(event.status);
  const mission = missionTitle(event.name);
  const when = formatUtc(t0);

  const outcome = FLOWN_STATUSES.has(status) && status !== 'completed'
    ? 'Launch failure'
    : status === 'completed'
      ? 'Launched successfully'
      : IN_FLIGHT_STATUSES.has(status)
        ? 'In flight'
        : STOOD_DOWN_STATUSES.has(status)
          ? 'Stood down'
          : `Launches ${when}`;

  if (decision.live) {
    const vehicle = event.rocket ? `${event.rocket} · ` : '';
    const title = `LIVE: ${mission} — ${event.rocket ?? 'launch'} | SpaceNexus`;
    const description = `Watch ${mission}${event.agency ? ` (${event.agency})` : ''} live: the stream, the countdown, the mission timeline and a live blog of every call. Liftoff ${when}. ${liveWindowSentence(decision)}`;
    return {
      title,
      description,
      ogTitle: `LIVE · ${mission}`.slice(0, 90),
      ogSubtitle: `${vehicle}${event.location ?? ''}`.replace(/ · $/, '') || 'Live launch coverage',
      outcome: 'Live now',
      live: true,
    };
  }

  const ogTitle = event.name.length > 70 ? event.name.slice(0, 67) + '…' : event.name;
  const ogSubtitle = [event.rocket, event.location, outcome].filter(Boolean).join(' · ');
  const description = `${event.name}${event.agency ? ` by ${event.agency}` : ''}${event.rocket ? ` on ${event.rocket}` : ''}${event.location ? ` from ${event.location}` : ''} — ${outcome}. Live countdown, stream, telemetry and the mission record.`;
  return {
    title: `${event.name} - Launch Day | SpaceNexus`,
    description,
    ogTitle,
    ogSubtitle,
    outcome,
    live: false,
  };
}

// ── Structured data ────────────────────────────────────────────────────────

export interface LaunchJsonLdInput {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  agency?: string | null;
  launchDate: Date | string | null;
  imageUrl?: string | null;
}

/**
 * BroadcastEvent while a launch is live (there is a stream to point at),
 * Event otherwise. Both carry the same identity so a crawler that sees the
 * page in both states does not treat them as two things.
 */
export function launchJsonLd(
  event: LaunchJsonLdInput,
  decision: LiveModeDecision,
  streamUrl: string | null,
): Record<string, unknown> {
  const url = `https://spacenexus.us/launch/${event.id}`;
  const t0 = toDate(event.launchDate);
  const mission = missionTitle(event.name);
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    name: event.name,
    url,
    description: event.description?.slice(0, 300) || `${mission} — live coverage, countdown and mission record on SpaceNexus.`,
    startDate: (decision.opensAt ?? t0)?.toISOString(),
    endDate: decision.closesAt?.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: streamUrl || url,
    },
    organizer: event.agency ? { '@type': 'Organization', name: event.agency } : undefined,
    image: event.imageUrl || undefined,
  };

  if (decision.live) {
    return {
      ...base,
      '@type': 'BroadcastEvent',
      isLiveBroadcast: decision.streamIsLive,
      videoFormat: 'HD',
      publishedOn: { '@type': 'BroadcastService', name: 'SpaceNexus Live' },
    };
  }

  return {
    ...base,
    '@type': 'Event',
    startDate: t0?.toISOString(),
    endDate: undefined,
    location: event.location
      ? { '@type': 'Place', name: event.location }
      : { '@type': 'VirtualLocation', url },
  };
}
