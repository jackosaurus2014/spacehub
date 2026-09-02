// ─── Space Tycoon: Game Constants ───────────────────────────────────────────

// Clock unification (2026-09-02, docs/GAME_DESIGN_REVIEW_2026-09.md D1): the
// world calendar (server-time.ts) is the ONE game clock. Everything below that
// converts between ticks and game-months derives from it — never retype 30,
// 60 s, or 12 min anywhere in the engine.
import { REAL_SECONDS_PER_GAME_MONTH } from './server-time';

/** Starting cash — sim-validated at $100M for balanced early progression.
 *  Players can afford 2-3 tier 1 buildings, then must earn more.
 *  All players start with the same amount regardless of subscription — see docs/POLICY.md. */
export const STARTING_MONEY = 100_000_000;

/** Starting year — matches real-world present */
export const STARTING_YEAR = 2026;

/** Cost scaling exponent per duplicate building at same location */
export const BUILDING_COST_SCALE = 1.15;

/** Revenue multiplier bonus per completed relevant research */
export const RESEARCH_REVENUE_BONUS = 0.1;

/** Research cost multiplier per tier */
export const RESEARCH_COST_TIER_EXPONENT = 1.5;

/** Research time multiplier per tier */
export const RESEARCH_TIME_TIER_EXPONENT = 0.8;

/** Construction queue — max simultaneous builds */
export const BASE_CONSTRUCTION_SLOTS = 2;
export const MAX_CONSTRUCTION_SLOTS = 5;

/** Max events in the log before trimming */
export const MAX_EVENT_LOG = 50;

/** Auto-save interval in real-time milliseconds */
export const AUTO_SAVE_INTERVAL_MS = 30_000;

/** Tick interval in ms by speed setting.
 *  Each tick processes one TICKS_PER_GAME_MONTH-th of monthly revenue/costs/
 *  production; the calendar itself comes from server-time.ts's wall-clock
 *  formula (getGlobalGameDate), not from counting ticks. At 1x speed one
 *  game-month = REAL_SECONDS_PER_GAME_MONTH = 6 real hours, one game-year =
 *  3 real days, ten game-years = 30 real days — the same clock leagues,
 *  quarters, seasons, expeditions and every BALANCE.md playtest run on.
 *  Construction/research timers use real wall-clock time (unaffected). */
export const TICK_INTERVALS: Record<number, number> = {
  0: 0,      // Paused
  1: 2000,   // 1x = 2s per tick
};

/** How many ticks make up one game month — DERIVED from the world calendar:
 *  21,600 s per game-month ÷ 2 s per tick = 10,800 ticks per game-month.
 *  Revenue, costs, payroll and production are divided by this number per
 *  tick, so a corporation's monthly P&L accrues over exactly one calendar
 *  month. Before 2026-09-02 this was a typed literal (30) while the calendar
 *  ran at 6 h/month — income accrued 360x faster than the world it was
 *  denominated in (see the dev log / docs/BALANCE.md "Clock unification"). */
export const TICKS_PER_GAME_MONTH = REAL_SECONDS_PER_GAME_MONTH / (TICK_INTERVALS[1] / 1000);

/** Game save version for migration support.
 *  NOTE (docs/LIVE_SERVICE_2026-08.md appendix defect #9): this literal has
 *  stayed at 1 since the earliest builds. The REAL migration ledger is the
 *  inline "V<n>" comments inside save-load.ts's getNewGameState()/loadGame()
 *  (currently V12 -> V25 as of Wave LS2). Two numbering schemes coexist —
 *  this constant is NOT what future agents should bump for a new migration;
 *  add a new additive "V<n> fields" block to save-load.ts instead, following
 *  the existing V-comment convention. */
export const SAVE_VERSION = 1;

// ─── Live-Service Wave LS1 "Night Shift" ────────────────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS1. Command queue depth, standing-directive
// ops-fee pricing, and the away-efficiency curve that replaces the old 8h
// hard cap (offline-income.ts, deleted this wave — see away-operations.ts).

/** Base free command-queue slots (research + build orders share one list).
 *  CLAUDE.md permits paid queue-slot convenience monetization beyond a
 *  reasonable free cap "later"; per the founder's monetization hold, LS1
 *  ships everything free/earnable — no purchased slots exist. */
export const COMMAND_QUEUE_BASE_DEPTH = 4;
/** +2 slots once Autonomous Operations research completes — thematically the
 *  "stations and mines run without human oversight" tech (research-tree.ts
 *  id 'autonomous_ops'), i.e. the spec's "parallel_research-style ops tech". */
export const COMMAND_QUEUE_AUTOMATION_RESEARCH_ID = 'autonomous_ops';
export const COMMAND_QUEUE_AUTOMATION_BONUS = 2;
/** +2 slots at corporation tier 5 (Megacorp-class operations). */
export const COMMAND_QUEUE_TIER5_BONUS = 2;
export const COMMAND_QUEUE_TIER5_THRESHOLD = 5;

/** Standing-directive ops-fee sink: $250K x activeDirectiveCount^1.3 per
 *  game-month. Superlinear so stacking automation is a real, escalating
 *  economic trade-off (docs/BALANCE.md sink pattern) rather than a free
 *  default — every active directive raises the cost of ALL of them. */
export const DIRECTIVE_OPS_FEE_BASE = 250_000;
export const DIRECTIVE_OPS_FEE_EXPONENT = 1.3;

/** Away-efficiency curve: uncapped TIME, capped RATE. Replaces
 *  offline-income.ts's dishonest MAX_OFFLINE_HOURS=8 wall (and its
 *  Math.max(0, netPerTick) clamp — appendix defect #1; see
 *  away-operations.ts). `maxHours` is the tier's upper bound of real hours
 *  away; `baseEfficiency` is the fraction of live-tick revenue/mining
 *  credited per tick in that bucket before any investment bonus. */
export interface AwayEfficiencyTier { maxHours: number; baseEfficiency: number; }
export const AWAY_EFFICIENCY_TIERS: AwayEfficiencyTier[] = [
  { maxHours: 12, baseEfficiency: 1.00 },        // 0-12h: full rate
  { maxHours: 48, baseEfficiency: 0.70 },         // 12-48h
  { maxHours: 24 * 7, baseEfficiency: 0.40 },     // 48h-7d
  { maxHours: Infinity, baseEfficiency: 0.15 },   // 7d+ floor
];
/** Investment (automation research + operator workforce share) raises tiers
 *  2-4 toward this cap — never to 1.0. Logging in must always beat staying
 *  away (MMO invariant, docs/LIVE_SERVICE_2026-08.md §2.2). */
export const AWAY_EFFICIENCY_INVESTMENT_CAP = 0.85;

// ─── Live-Service Wave LS2 "Operations Debrief" ─────────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS2. Debrief presentation tiers (§2.2 item 5)
// and the Returning Commander re-onboarding track (≥14-day lapse).

/** Below this away-duration, away-operations.ts still computes a ledger (its
 *  own floor is 30s) but the debrief renders as a minimal, non-blocking
 *  toast rather than a modal — "not everything is a full-screen
 *  interruption." */
export const DEBRIEF_COMPACT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
/** At/above this away-duration the debrief gets the full cinematic
 *  treatment (Ken-Burns art band, reusing CinematicOverlay's CSS). */
export const DEBRIEF_CINEMATIC_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/** A lapse at/beyond this duration triggers the Returning Commander track —
 *  the veteran re-onboarding flow (LS2 mechanic 2), distinct from the
 *  brand-new-player onramp (frontier.ts / catchup-mechanics.ts newcomer
 *  functions, which key off ACCOUNT age, not absence). */
export const RETURNING_COMMANDER_LAPSE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** The 7-day re-engagement window (§LS2: "7-day re-engagement objectives,
 *  one per loop"). Objectives stop being trackable once this expires, but a
 *  returning player is never blocked from anything — this only affects
 *  whether the widget/objectives display. */
export const RETURNING_COMMANDER_TRACK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** The temporary earnings boost decays from +30% (1.3x) to +0% (1.0x)
 *  linearly over 14 real days — reuses getNewcomerMultiplier's SHAPE
 *  (catchup-mechanics.ts: 2.0x day-1 newcomer boost decaying to 1.0x) at a
 *  deliberately smaller magnitude, since a RETURNING veteran already owns an
 *  established empire (CLAUDE.md: catch-up narrows the gap, never inverts
 *  it — a lapsed veteran should not out-earn an always-online veteran). */
export const RETURNING_COMMANDER_BOOST_INITIAL = 0.3;
export const RETURNING_COMMANDER_BOOST_DECAY_MS = 14 * 24 * 60 * 60 * 1000;

/** One-time re-entry stipend, scaled by how long the player was gone (more
 *  catch-up for a longer lapse), flat-capped so it can never rival active
 *  play — deterministic, no P2W (CLAUDE.md: "never direct money... faster
 *  than earnable progression" governs PURCHASES, not this free, earnable-
 *  equivalent catch-up grant, same class as the pioneer bonus it mirrors in
 *  shape). */
export const RETURNING_COMMANDER_STIPEND_PER_DAY = 5_000_000;
export const RETURNING_COMMANDER_STIPEND_CAP = 250_000_000;

/** Mentorship (LS2 mechanic 3 — wiring catchup-mechanics.ts's previously
 *  dead-code calculateMentorshipRewards through a real server pairing).
 *  Caps mirror the values already authored there: mentor +5% revenue while
 *  active, mentee +20% revenue/mining/research while mentored. */
export const MENTOR_REVENUE_BONUS_CAP = 0.05;
export const MENTEE_BOOST_CAP = 0.20;
export const MAX_MENTEES_PER_MENTOR = 3;

/** localStorage key */
export const SAVE_KEY = 'spacetycoon_save';

/** Dev-mode speed multiplier — divides all construction and research durations by this factor.
 *  Enabled by setting NEXT_PUBLIC_DEV_FAST=true in .env.local. Ignored in production builds.
 *  100x means a 5-minute build finishes in 3 seconds. */
export const DEV_FAST_MULTIPLIER =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_FAST === 'true' ? 100 : 1;

/** Dev-mode revenue multiplier — scales service revenue per tick. Costs are
 *  unaffected so balance pressures (overhead, exec comp, saturation, broker
 *  fees) remain proportionally meaningful — wealth just accumulates faster
 *  for testing. Gated on NEXT_PUBLIC_DEV_FAST same as DEV_FAST_MULTIPLIER. */
export const DEV_REVENUE_MULTIPLIER =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_FAST === 'true' ? 10 : 1;
