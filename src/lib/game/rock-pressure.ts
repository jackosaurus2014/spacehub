// ─── Space Tycoon: extraction pressure on SHARED rocks (mining Phase B) ─────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §3 "Depletion": "open rocks under
// extraction pressure deplete for everyone". Phase A's reserve decrement is
// the depletion; this module is the PRESSURE — when several corporations
// work the same UNCLAIMED rock in an overlapping window, each one's hold
// comes home lighter. A CLAIMED rock is exclusive (share 1) — that is what
// the claim fee buys.
//
// Formula (documented in docs/BALANCE.md Pass 12):
//   share(n) = n ^ (−ROCK_PRESSURE_EXPONENT)      n = distinct corporations
//   share(1) = 1, share(2) ≈ 0.71, share(3) ≈ 0.58, share(4) = 0.50
// Total extraction n × share(n) = √n grows sub-linearly: the rock's face is
// the bottleneck, and interference + spoil eat the rest. Compared with the
// deposit-level module (extraction-pressure.ts, a location-wide grade
// decay), this is per-rock and per-window, and it applies at COMPLETION on
// the server (server-mining.ts) from the orders that actually overlapped,
// with the client planner quoting the same formula from the public
// activity count so the preview is honest.
//
// Pure. Shared by mining-orders.ts (client quote), server-mining.ts
// (settlement) and scripts/sim-mining.ts.

export const ROCK_PRESSURE_EXPONENT = 0.5;

/** Floor on any single corporation's share — a crowded rock still yields
 *  something to everyone (nobody is starved out by numbers alone). */
export const ROCK_PRESSURE_MIN_SHARE = 0.25;

/** The share of its quoted fill ONE corporation actually lands when
 *  `concurrentMiners` corporations (INCLUDING itself) worked the rock in
 *  the same window. Claimed rocks pass `claimed: true` → 1. */
export function rockPressureShare(concurrentMiners: number, claimed: boolean = false): number {
  if (claimed) return 1;
  const n = Math.max(1, Math.floor(Number.isFinite(concurrentMiners) ? concurrentMiners : 1));
  const raw = Math.pow(n, -ROCK_PRESSURE_EXPONENT);
  return Math.round(Math.max(ROCK_PRESSURE_MIN_SHARE, Math.min(1, raw)) * 1000) / 1000;
}

/** Units actually landed from a quoted fill under pressure (never above the
 *  fill, never below 0; a positive fill always lands at least 1 unit). */
export function applyRockPressure(fillUnits: number, share: number): number {
  const fill = Math.max(0, Math.floor(fillUnits));
  if (fill <= 0) return 0;
  const s = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 1));
  return Math.max(1, Math.min(fill, Math.round(fill * s)));
}

/** Count the distinct corporations whose 'mine' orders on one rock overlap
 *  a window. Pure — the server passes its order rows, the sim its own. */
export function countConcurrentMiners(
  orders: ReadonlyArray<{ profileId: string; asteroidId: string | null; mode: string; arrivesAtMs: number; miningEndsAtMs: number }>,
  asteroidId: string,
  windowStartMs: number,
  windowEndMs: number,
  selfProfileId: string,
): number {
  const ids = new Set<string>([selfProfileId]);
  for (const o of orders) {
    if (o.mode !== 'mine' || o.asteroidId !== asteroidId) continue;
    if (o.miningEndsAtMs <= windowStartMs || o.arrivesAtMs >= windowEndMs) continue;
    ids.add(o.profileId);
  }
  return ids.size;
}
