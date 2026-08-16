// ─── Space Tycoon: Trade Lanes — usage investment (Economic PvP Wave E5, ────
// docs/ECONOMY_PVP_2026-08.md §2.8/§E5). CLAUDE.md: "shipping lanes are
// investments... routes get faster, safer, and cheaper with repeated use and
// infrastructure investment... abandoning a lane degrades it." Today every
// freight dispatch pays the same Δv-priced fuel bill forever (cargo-
// logistics.ts) — this module adds a server-shared, per-lane usage counter
// that discounts the fuel bill (beacons/traffic-control infrastructure,
// implicitly "purchased" by the traffic itself — no separate building spend,
// per the spec's "cheap, one server table" scope) and decays when a lane goes
// quiet.
//
//   bonusPct(lane) = LANE_BONUS_CAP × saturate(usage / LANE_USAGE_FOR_MAX_BONUS)
//
// usage is a decaying counter of dispatches (any ship, any direction — a
// lane is a shared corridor, not a one-way private road), decayed lazily at
// each write (no cron drift, same posture as extraction-pressure.ts).
//
// BOUNDARY: server-shared (LaneUsage table, written whenever a dispatch's
// lane-usage delta reaches the sync route, delivered back down through the
// server-effects hand-off as `laneBonuses` — same pattern as demandPools /
// extractionPressure). The deterministic client tick only ever READS the
// last snapshot; it never computes cross-player usage itself.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cap on the freight fuel-cost discount a heavily-used lane can earn. */
export const LANE_BONUS_CAP = 0.15;

/** Dispatch-equivalents (post-decay) at which a lane reaches the full
 *  discount. Chosen so a lane used a few times a week by a handful of
 *  corporations meaningfully discounts within a month, while a single
 *  occasional dispatch barely moves it (steady-state intuition below). */
export const LANE_USAGE_FOR_MAX_BONUS = 40;

/** Daily decay factor — an abandoned lane's infrastructure edge fades over
 *  weeks, not instantly (gentler than extraction-pressure's 10%/day since
 *  this represents durable infrastructure, not a consumable deposit). */
export const LANE_USAGE_DECAY_PER_DAY = 0.97;

/** Canonical lane key — undirected (a corridor benefits traffic either way). */
export function laneKey(from: string, to: string): string {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

/** Decay a usage counter by elapsed real time. Pure. */
export function decayLaneUsage(usage: number, elapsedMs: number): number {
  if (!Number.isFinite(usage) || usage <= 0) return 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return usage;
  const days = elapsedMs / DAY_MS;
  return usage * Math.pow(LANE_USAGE_DECAY_PER_DAY, days);
}

/** Apply N fresh dispatches to a (decayed) usage counter. Pure — mirrors
 *  extraction-pressure.applyExtractionEvent's decay-then-add shape. */
export function applyLaneUsageEvent(
  prevUsage: number,
  prevUpdatedAtMs: number,
  dispatches: number,
  nowMs: number,
): { usage: number; updatedAtMs: number } {
  const decayed = decayLaneUsage(prevUsage, Math.max(0, nowMs - prevUpdatedAtMs));
  return { usage: decayed + Math.max(0, dispatches), updatedAtMs: nowMs };
}

/** Read-time decay (serving a snapshot without a fresh dispatch). */
export function readLaneUsage(storedUsage: number, storedUpdatedAtMs: number, nowMs: number): number {
  return decayLaneUsage(storedUsage, Math.max(0, nowMs - storedUpdatedAtMs));
}

/** Fuel-cost discount fraction (0..LANE_BONUS_CAP) for a usage counter. */
export function computeLaneBonus(usage: number): number {
  const saturation = Math.min(1, Math.max(0, usage) / LANE_USAGE_FOR_MAX_BONUS);
  return LANE_BONUS_CAP * saturation;
}

// ─── The sync-down snapshot (delivered like demandPools) ────────────────────

export type LaneBonusSnapshot = { bonuses: Record<string, number>; asOf: number };

/** Snapshot older than this degrades to zero bonus — offline players never
 *  see a stale discount that no longer reflects real traffic. */
export const LANE_BONUS_STALE_MS = 14 * 24 * 60 * 60 * 1000;

/** Read a lane's fuel-discount fraction from a (possibly stale/absent)
 *  snapshot, defaulting to 0 — the deterministic client fallback. */
export function getLaneBonus(
  snapshot: LaneBonusSnapshot | null | undefined,
  from: string,
  to: string,
  nowMs: number = Date.now(),
): number {
  if (!snapshot || !snapshot.bonuses) return 0;
  if (nowMs - snapshot.asOf > LANE_BONUS_STALE_MS) return 0;
  const v = snapshot.bonuses[laneKey(from, to)];
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(LANE_BONUS_CAP, v));
}

// ─── Client accumulation + hand-off (mirrors market-pressure.ts exactly) ────
// dispatchShipWithCargo (cargo-logistics.ts) records one dispatch per lane
// directly into state.pendingLaneUsage at departure time (it already returns
// a new GameState, unlike the tick loop's per-resource mined flows). useGameSync
// sends the pending map, then queues the transmitted amounts here for
// processFullTick to subtract on the next tick — identical single-slot
// hand-off shape to market-pressure.ts's queueMarketFlowFlush, kept in its
// own tiny queue because lane usage is keyed by lane, not resource.

export const LANE_DISPATCH_CAP = 500; // bound client-side accumulation for never-synced players

/** Merge a fresh dispatch into the pending per-lane counter (pure). */
export function accumulateLaneUsage(
  pending: Record<string, number> | undefined,
  from: string,
  to: string,
): Record<string, number> {
  const out = { ...(pending || {}) };
  const key = laneKey(from, to);
  out[key] = Math.min(LANE_DISPATCH_CAP, (out[key] || 0) + 1);
  return out;
}

/** Subtract transmitted amounts after a successful sync (pure, clamped ≥ 0). */
export function subtractTransmittedLaneUsage(
  pending: Record<string, number> | undefined,
  sent: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, q] of Object.entries(pending || {})) {
    const remaining = q - (sent[key] || 0);
    if (remaining > 0) out[key] = remaining;
  }
  return out;
}

let pendingLaneFlush: Record<string, number> | null = null;

/** Queue the lane usage a successful sync just transmitted. Called by useGameSync. */
export function queueLaneUsageFlush(sent: Record<string, number>): void {
  if (!sent || Object.keys(sent).length === 0) return;
  if (!pendingLaneFlush) {
    pendingLaneFlush = { ...sent };
    return;
  }
  for (const [key, q] of Object.entries(sent)) {
    pendingLaneFlush[key] = (pendingLaneFlush[key] || 0) + q;
  }
}

/** Consume the queued flush (engine, once per tick). */
export function consumeLaneUsageFlush(): Record<string, number> | null {
  const f = pendingLaneFlush;
  pendingLaneFlush = null;
  return f;
}

/** Test helper — clears the queue. */
export function __clearLaneUsageQueue(): void {
  pendingLaneFlush = null;
}
