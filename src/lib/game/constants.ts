// ─── Space Tycoon: Game Constants ───────────────────────────────────────────

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
 *  Each tick processes revenue/costs but the calendar advances based on
 *  TICKS_PER_GAME_MONTH. At 1x speed with 30 ticks/month:
 *  1 game month = 60 seconds, 1 game year = 12 minutes, 10 years = 2 hours.
 *  A casual player logging in daily for 30 min progresses ~2.5 years/month.
 *  Construction/research timers use real wall-clock time (unaffected). */
export const TICK_INTERVALS: Record<number, number> = {
  0: 0,      // Paused
  1: 2000,   // 1x = 2s per tick
};

/** How many ticks equal one game month.
 *  Higher = slower calendar progression.
 *  30 ticks × 2s = 60 seconds per game month = 12 min/year.
 *  Revenue and costs are divided by this number per tick. */
export const TICKS_PER_GAME_MONTH = 30;

/** Game save version for migration support.
 *  NOTE (docs/LIVE_SERVICE_2026-08.md appendix defect #9): this literal has
 *  stayed at 1 since the earliest builds. The REAL migration ledger is the
 *  inline "V<n>" comments inside save-load.ts's getNewGameState()/loadGame()
 *  (currently V12 -> V24 as of Wave LS1). Two numbering schemes coexist —
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
