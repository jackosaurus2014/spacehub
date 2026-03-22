// ─── Space Tycoon: Game Constants ───────────────────────────────────────────

/** Starting cash — sim-validated at $100M for balanced early progression.
 *  Players can afford 2-3 tier 1 buildings, then must earn more.
 *  Pro subscribers get +35%, Enterprise gets +70%. */
export const STARTING_MONEY = 100_000_000;
export const STARTING_MONEY_PRO = 135_000_000;
export const STARTING_MONEY_ENTERPRISE = 170_000_000;

/** Starting year */
export const STARTING_YEAR = 2025;

/** Cost scaling exponent per duplicate building at same location */
export const BUILDING_COST_SCALE = 1.15;

/** Revenue multiplier bonus per completed relevant research */
export const RESEARCH_REVENUE_BONUS = 0.1;

/** Research cost multiplier per tier */
export const RESEARCH_COST_TIER_EXPONENT = 1.5;

/** Research time multiplier per tier */
export const RESEARCH_TIME_TIER_EXPONENT = 0.8;

/** Max events in the log before trimming */
export const MAX_EVENT_LOG = 50;

/** Auto-save interval in real-time milliseconds */
export const AUTO_SAVE_INTERVAL_MS = 30_000;

/** Tick interval in ms by speed setting */
export const TICK_INTERVALS: Record<number, number> = {
  0: 0,      // Paused
  1: 2000,   // 1x = 2s per month
  2: 1000,   // 2x = 1s per month
  5: 400,    // 5x
  10: 200,   // 10x
};

/** Game save version for migration support */
export const SAVE_VERSION = 1;

/** localStorage key */
export const SAVE_KEY = 'spacetycoon_save';
