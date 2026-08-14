// ─── Space Tycoon: "Sol Events" real-world feed ───────────────────────────────
//
// World-shared, server-derived flavor events for the game. Every player sees
// the exact same feed — it is NOT computed from anything player-specific.
// Every event here is derived from data the site already collects for its
// real-world editorial modules:
//
//   - space weather (NOAA SWPC Kp-index + GOES X-ray flux, cached via
//     src/lib/dynamic-content.ts by src/lib/module-api-fetchers.ts)
//   - live/imminent launches (SpaceEvent rows, the same table
//     src/lib/livestream-detector.ts reads for launch webcasts)
//   - Artemis / Starship program milestones (src/lib/artemis-news.ts,
//     src/lib/starship-news.ts — the same predicates that back /artemis and
//     /starship's live news rails)
//
// No external fetches happen here and no randomness is used — every function
// in this module is a pure, deterministic transform of already-cached
// DB/lib data (or, for the orchestrator, a straight read of that data). That
// keeps the /api/space-tycoon/world-feed route cheap and cacheable, and keeps
// the derivation logic unit-testable without touching Prisma or NOAA.
//
// CLAUDE.md ("Real-world data must enter as WORLD-SHARED server data...
// applied client-side as time-bounded flavor/economic events. Never
// fabricate real-world facts."): every headline here is built from a real,
// cached fact — never invented copy.

export type WorldEventType = 'solar-storm' | 'launch-window' | 'milestone';
export type WorldEventSeverity = 'notice' | 'elevated' | 'severe';

export interface WorldEvent {
  /** Stable per-type id — one active event per type at a time. */
  id: string;
  type: WorldEventType;
  severity: WorldEventSeverity;
  /** Short in-universe-flavored headline naming the real fact. */
  headline: string;
  /** One-line "why you're seeing this" archive framing for the banner. */
  sourceLabel: string;
  /** Where to send a player who wants the real coverage. */
  href: string;
  /** ISO timestamp — the banner should stop showing this after this time. */
  expiresAt: string;
}

// ─── 1. Space weather (NOAA SWPC via space-environment module) ───────────────

export interface SpaceWeatherSnapshot {
  currentKp: number | null;
  stormLevel: string | null;
  /** ms timestamp the Kp reading was last refreshed, if known. */
  kpRefreshedAtMs: number | null;
  /** e.g. "X1.2", "M3.4", "C1.0" — NOAA GOES current_class string. */
  flareClass: string | null;
  /** ms timestamp the flare reading was last refreshed, if known. */
  flareRefreshedAtMs: number | null;
}

/** Kp threshold for a "storm watch" flavor event (NOAA G1/G2 territory). */
const KP_ELEVATED_THRESHOLD = 5;
/** Kp threshold for a "severe storm" flavor event (NOAA G3+ territory). */
const KP_SEVERE_THRESHOLD = 7;

/** Data older than this is treated as stale — a stuck cron shouldn't leave a
 *  "solar storm happening now" banner up for days after the storm passed. */
const MAX_SPACE_WEATHER_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Flavor window a solar-storm event stays "active" for once derived — real
 *  geomagnetic storms typically run a few hours; this is an estimate, not an
 *  authoritative forecast (the feed re-derives from live data every poll
 *  anyway, so this only bounds how stale the client-side flavor can get
 *  between polls). */
const SOLAR_STORM_EVENT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

function flareLetter(flareClass: string | null): 'X' | 'M' | 'C' | 'B' | 'A' | null {
  if (!flareClass) return null;
  const letter = flareClass.trim().charAt(0).toUpperCase();
  return letter === 'X' || letter === 'M' || letter === 'C' || letter === 'B' || letter === 'A'
    ? letter
    : null;
}

/**
 * Pure derivation: is there an active "solar storm" flavor event right now?
 * Fires when the current planetary Kp index is elevated (>=5) OR an M/X-class
 * solar flare is the current GOES reading. Severity escalates at Kp>=7 or an
 * X-class flare.
 */
export function deriveSolarStormEvent(
  snapshot: SpaceWeatherSnapshot,
  nowMs: number = Date.now(),
): WorldEvent | null {
  const kpFresh =
    snapshot.currentKp !== null &&
    snapshot.kpRefreshedAtMs !== null &&
    nowMs - snapshot.kpRefreshedAtMs <= MAX_SPACE_WEATHER_AGE_MS;
  const flareFresh =
    snapshot.flareClass !== null &&
    snapshot.flareRefreshedAtMs !== null &&
    nowMs - snapshot.flareRefreshedAtMs <= MAX_SPACE_WEATHER_AGE_MS;

  const letter = flareFresh ? flareLetter(snapshot.flareClass) : null;
  const kp = kpFresh ? snapshot.currentKp : null;

  const kpSevere = kp !== null && kp >= KP_SEVERE_THRESHOLD;
  const kpElevated = kp !== null && kp >= KP_ELEVATED_THRESHOLD;
  const flareSevere = letter === 'X';
  const flareElevated = letter === 'M' || letter === 'X';

  if (!kpElevated && !flareElevated) return null;

  const severity: WorldEventSeverity = kpSevere || flareSevere ? 'severe' : 'elevated';

  // Prefer describing whichever condition is more dramatic; mention both when
  // both are active so players get the full real picture.
  const parts: string[] = [];
  if (kpElevated) parts.push(`Kp ${kp} geomagnetic storm`);
  if (flareElevated) parts.push(`${snapshot.flareClass} solar flare`);
  const headline = `Solar activity alert: ${parts.join(' + ')} in progress`;

  return {
    id: 'solar-storm',
    type: 'solar-storm',
    severity,
    headline,
    sourceLabel: 'Mirrored from real heliophysics data (NOAA SWPC)',
    href: '/space-environment',
    expiresAt: new Date(nowMs + SOLAR_STORM_EVENT_WINDOW_MS).toISOString(),
  };
}

// ─── 2. Live launch window (SpaceEvent rows) ──────────────────────────────────

export interface LaunchEventLite {
  name: string;
  agency: string | null;
  /** ms timestamp of the scheduled/actual launch. */
  launchDateMs: number | null;
  status: string | null;
  webcastLive: boolean;
  isLive: boolean;
}

/** How far before T-0 a launch counts as an active "launch window" event. */
const LAUNCH_WINDOW_BEFORE_MS = 60 * 60 * 1000; // 1 hour
/** How long after T-0 a launch still counts as "live" (webcast tail). */
const LAUNCH_WINDOW_AFTER_MS = 90 * 60 * 1000; // 90 minutes
const LIVE_LAUNCH_STATUSES = new Set(['upcoming', 'go', 'in_progress']);

/**
 * Pure derivation: is a real launch live or within ~1h of T-0 right now?
 * Picks the single most relevant candidate (currently live/webcasting first,
 * otherwise the soonest upcoming liftoff in the window).
 */
export function deriveLaunchWindowEvent(
  events: LaunchEventLite[],
  nowMs: number = Date.now(),
): WorldEvent | null {
  const candidates = events.filter((e) => {
    if (e.launchDateMs === null) return false;
    if (e.status && !LIVE_LAUNCH_STATUSES.has(e.status)) return false;
    const delta = e.launchDateMs - nowMs; // positive = still upcoming
    return delta <= LAUNCH_WINDOW_BEFORE_MS && delta >= -LAUNCH_WINDOW_AFTER_MS;
  });
  if (candidates.length === 0) return null;

  // Prefer an explicitly-flagged live webcast; otherwise the soonest T-0.
  const live = candidates.find((e) => e.webcastLive || e.isLive);
  const chosen = live || [...candidates].sort(
    (a, b) => Math.abs((a.launchDateMs || 0) - nowMs) - Math.abs((b.launchDateMs || 0) - nowMs),
  )[0];

  const isCurrentlyLive = chosen.webcastLive || chosen.isLive || (chosen.launchDateMs !== null && chosen.launchDateMs <= nowMs);
  const missionLabel = chosen.agency ? `${chosen.agency}: ${chosen.name}` : chosen.name;
  const headline = isCurrentlyLive
    ? `Live now in reality: ${missionLabel}`
    : `Launch window opening soon: ${missionLabel}`;

  return {
    id: 'launch-window',
    type: 'launch-window',
    severity: 'notice',
    headline,
    sourceLabel: isCurrentlyLive
      ? 'Happening now in reality'
      : 'Mirrored from the real upcoming launch schedule',
    href: '/live',
    expiresAt: new Date((chosen.launchDateMs || nowMs) + LAUNCH_WINDOW_AFTER_MS).toISOString(),
  };
}

// ─── 3. Program milestone (Artemis / Starship news) ───────────────────────────

export type MilestoneProgram = 'artemis' | 'starship';

export interface MilestoneCandidate {
  title: string;
  /** ms timestamp the article was published. */
  publishedAtMs: number;
  program: MilestoneProgram;
}

/** A milestone only counts as "recent" inside this window. */
const MILESTONE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Program coverage includes plenty of fluff (merch, opinion, pop-culture
 * pieces). Only headlines with genuine mission-progress language may fire
 * the milestone event — otherwise the research bonus would be permanently
 * on, since Starship/Artemis articles appear nearly every week.
 */
const MILESTONE_KEYWORDS = [
  'launch', 'launches', 'launched', 'liftoff', 'lift-off',
  'landing', 'lands', 'landed', 'splashdown', 'touchdown',
  'flight', 'test fire', 'static fire', 'hot fire', 'engine test',
  'docking', 'docked', 'undocking', 'orbit', 'orbital', 'deorbit',
  'catch', 'caught', 'booster', 'propellant transfer', 'refueling', 'refuelling',
  'milestone', 'success', 'successful', 'completes', 'completed',
  'crewed', 'crew-', 'astronauts', 'rollout', 'rolls out', 'stacking', 'stacked',
  'wet dress', 'countdown', 'reentry', 're-entry', 'demo',
];

export function isMilestoneHeadline(title: string): boolean {
  const t = title.toLowerCase();
  return MILESTONE_KEYWORDS.some((k) => t.includes(k));
}

const MILESTONE_HREF: Record<MilestoneProgram, string> = {
  artemis: '/artemis',
  starship: '/starship',
};

/**
 * Pure derivation: pick the single newest program milestone across the
 * supplied candidates (typically the latest Artemis-tracker and
 * Starship-tracker article), if it's less than 7 days old.
 */
export function deriveMilestoneEvent(
  candidates: MilestoneCandidate[],
  nowMs: number = Date.now(),
): WorldEvent | null {
  const fresh = candidates
    .filter((c) => nowMs - c.publishedAtMs <= MILESTONE_MAX_AGE_MS && nowMs - c.publishedAtMs >= 0)
    .filter((c) => isMilestoneHeadline(c.title))
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs);
  if (fresh.length === 0) return null;

  const newest = fresh[0];
  const programLabel = newest.program === 'artemis' ? 'Artemis program' : 'Starship program';

  return {
    id: 'milestone',
    type: 'milestone',
    severity: 'notice',
    headline: `${programLabel} milestone: ${newest.title}`,
    sourceLabel: 'Mirrored from real mission-tracker coverage',
    href: MILESTONE_HREF[newest.program],
    expiresAt: new Date(newest.publishedAtMs + MILESTONE_MAX_AGE_MS).toISOString(),
  };
}

// ─── Orchestrator ──────────────────────────────────────────────────────────

/**
 * Reads the already-cached DB/lib sources and derives the full active
 * world-events list. No external network calls happen here — every source is
 * either a DynamicContent row (populated by the site's existing NOAA/DONKI
 * crons) or a NewsArticle query (populated by the existing news pipeline).
 * Each source is isolated in its own try/catch so one failing lookup can't
 * blank out the other two event types.
 */
export async function getActiveWorldEvents(nowMs: number = Date.now()): Promise<WorldEvent[]> {
  const events: WorldEvent[] = [];

  // 1. Space weather
  try {
    const { getContentItem } = await import('@/lib/dynamic-content');
    const [kpItem, xrayItem] = await Promise.all([
      getContentItem<{ currentKp: number; stormLevel: string }>('space-environment:kp-index-live'),
      getContentItem<{ latest?: { currentClass: string | null }; summary?: { currentClass: string | null; peakFlareClass: string | null } }>(
        'space-environment:goes-xray',
      ),
    ]);

    const flareClass =
      xrayItem?.data?.summary?.currentClass ??
      xrayItem?.data?.summary?.peakFlareClass ??
      xrayItem?.data?.latest?.currentClass ??
      null;

    const snapshot: SpaceWeatherSnapshot = {
      currentKp: kpItem?.data?.currentKp ?? null,
      stormLevel: kpItem?.data?.stormLevel ?? null,
      kpRefreshedAtMs: kpItem ? new Date(kpItem.refreshedAt).getTime() : null,
      flareClass,
      flareRefreshedAtMs: xrayItem ? new Date(xrayItem.refreshedAt).getTime() : null,
    };

    const stormEvent = deriveSolarStormEvent(snapshot, nowMs);
    if (stormEvent) events.push(stormEvent);
  } catch {
    // Space weather is flavor, not critical — skip on failure.
  }

  // 2. Live launch window
  try {
    const { default: prisma } = await import('@/lib/db');
    const rows = await prisma.spaceEvent.findMany({
      where: {
        launchDate: {
          gte: new Date(nowMs - LAUNCH_WINDOW_AFTER_MS),
          lte: new Date(nowMs + LAUNCH_WINDOW_BEFORE_MS),
        },
      },
      select: {
        name: true,
        agency: true,
        launchDate: true,
        status: true,
        webcastLive: true,
        isLive: true,
      },
      orderBy: { launchDate: 'asc' },
      take: 20,
    });

    const lite: LaunchEventLite[] = rows.map((r) => ({
      name: r.name,
      agency: r.agency,
      launchDateMs: r.launchDate ? new Date(r.launchDate).getTime() : null,
      status: r.status,
      webcastLive: r.webcastLive,
      isLive: r.isLive,
    }));

    const launchEvent = deriveLaunchWindowEvent(lite, nowMs);
    if (launchEvent) events.push(launchEvent);
  } catch {
    // Launch data is flavor, not critical — skip on failure.
  }

  // 3. Program milestone (newest of Artemis / Starship tracker news)
  try {
    const [{ getArtemisNewsArticles }, { getStarshipNewsArticles }] = await Promise.all([
      import('@/lib/artemis-news'),
      import('@/lib/starship-news'),
    ]);
    const [artemisArticles, starshipArticles] = await Promise.all([
      getArtemisNewsArticles(1),
      getStarshipNewsArticles(1),
    ]);

    const candidates: MilestoneCandidate[] = [];
    if (artemisArticles[0]?.publishedAt) {
      candidates.push({
        title: artemisArticles[0].title,
        publishedAtMs: new Date(artemisArticles[0].publishedAt).getTime(),
        program: 'artemis',
      });
    }
    if (starshipArticles[0]?.publishedAt) {
      candidates.push({
        title: starshipArticles[0].title,
        publishedAtMs: new Date(starshipArticles[0].publishedAt).getTime(),
        program: 'starship',
      });
    }

    const milestoneEvent = deriveMilestoneEvent(candidates, nowMs);
    if (milestoneEvent) events.push(milestoneEvent);
  } catch {
    // Milestone news is flavor, not critical — skip on failure.
  }

  return events;
}

// ─── World-shared game effects (modest, time-bounded) ─────────────────────────
//
// Consumed client-side by WorldEventsBanner.tsx via server-effects.ts's
// existing queue (queueServerEffects/consumeServerEffects), the same
// mechanism the alliance-bonus sync pipeline uses to reach game-engine's
// tick. Kept intentionally tiny and flat — no stacking, no compounding.

export interface WorldEventBonuses {
  /** Contract payout bonus while a real launch window is active (+10%). */
  contractPayoutBonus: number;
  /** Research speed bonus while a program milestone is <7 days old (+10%). */
  researchSpeedBonus: number;
  expiresAtMs: number;
}

const LAUNCH_CONTRACT_PAYOUT_BONUS = 0.10;
const MILESTONE_RESEARCH_SPEED_BONUS = 0.10;

/**
 * Pure transform: turn the active WorldEvent list into the flat bonus object
 * the tick engine consumes. Solar-storm intentionally contributes no live
 * multiplier here — see the header comment on WorldEventsBanner.tsx for why
 * hazard-risk was kept display-only (hazards.ts's occurrence roll has no
 * external-multiplier hook, and adding one would risk that system's
 * deterministic-reproducibility guarantees).
 */
export function deriveWorldEventBonuses(events: WorldEvent[], nowMs: number = Date.now()): WorldEventBonuses | null {
  const launch = events.find((e) => e.type === 'launch-window');
  const milestone = events.find((e) => e.type === 'milestone');
  if (!launch && !milestone) return null;

  const expiries = [launch, milestone]
    .filter((e): e is WorldEvent => !!e)
    .map((e) => new Date(e.expiresAt).getTime())
    .filter((ms) => Number.isFinite(ms));
  const expiresAtMs = expiries.length > 0 ? Math.max(...expiries) : nowMs;

  return {
    contractPayoutBonus: launch ? LAUNCH_CONTRACT_PAYOUT_BONUS : 0,
    researchSpeedBonus: milestone ? MILESTONE_RESEARCH_SPEED_BONUS : 0,
    expiresAtMs,
  };
}
