// ─── Space Tycoon: Orbital Slot Lease Auctions ──────────────────────────────
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 5): finishes the
// computeOrbitalSlotReport TODO in spatial-strategy.ts — once a pool
// crosses SATURATED_OCCUPANCY_PCT (85%), a new build there requires winning
// a sealed-bid slot-lease auction instead of just paying the build cost.
// Pure/deterministic helpers live here; DB access lives in the API routes
// (src/app/api/space-tycoon/orbital-slots/*) that call them, mirroring the
// bounty/bidding escrow pattern (server-ledger.ts + isLedgerAvailable()).

import { ORBITAL_SLOT_MAP, getChokepointPremium } from './spatial-strategy';

/** Lease term once an auction is won — 90 real-world days. Long enough to be
 *  a real strategic asset, short enough that a slot doesn't get permanently
 *  locked away from a player who could put it to better use. */
export const LEASE_TERM_MS = 90 * 24 * 60 * 60 * 1000;

/** Sealed-bid window — long enough to be a genuinely competitive auction
 *  (calendar-visible, per CLAUDE.md "premium locations... are finite and
 *  contested"), short enough to fit the weekly loop (SESSION_DESIGN.md
 *  "slot auctions = weekly"). */
export const AUCTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Baseline reference value per slot, before chokepoint premium — a rough
 *  proxy for "what a T3 building's worth of orbital real estate is worth,"
 *  scaled by pool prestige (GEO > lunar > Mars > Jovian, matching totalSlots
 *  scarcity ordering... inverted: fewer slots = scarcer = pricier per slot). */
const BASE_SLOT_VALUE: Record<string, number> = {
  geo: 25_000_000,
  lunar_orbit: 60_000_000,
  mars_orbit: 15_000_000,
  jupiter_system: 20_000_000,
};

/** Minimum opening bid for a new auction at `locationId` — base slot value ×
 *  the location's chokepoint premium (critical chokepoints like LEO/GEO cost
 *  more to contest — CLAUDE.md "chokepoints are real"). */
export function computeMinBid(locationId: string): number {
  const base = BASE_SLOT_VALUE[locationId] ?? 20_000_000;
  return Math.round(base * getChokepointPremium(locationId));
}

/** Governor's cut of a winning bid before the rest is burned (BALANCE.md
 *  money sink — "slot-lease proceeds are burned"). Small but real: zone
 *  control pays dividends without undoing the sink (canon: "zone control ...
 *  governor revenue share"). Mirrors zone-influence.ts's getGovernorBenefits
 *  2% service tax rate order of magnitude, scaled up (10%) since this is a
 *  one-off high-value event, not a recurring monthly tax. */
export const GOVERNOR_BURN_SHARE = 0.10;

export interface AuctionBidForResolution {
  bidId: string;
  profileId: string;
  amount: number;
  createdAt: number; // ms epoch
}

export interface AuctionResolution {
  winnerBidId: string | null;
  winnerProfileId: string | null;
  winningAmount: number;
  /** Every bid EXCEPT the winner — these get refunded in full. */
  losingBidIds: string[];
}

/**
 * Resolve a sealed-bid auction: highest amount wins. Ties broken by
 * earliest `createdAt` (first mover advantage — deterministic, no RNG, so
 * resolution is reproducible/auditable). No bids -> no winner (auction
 * expires, minBid unmet).
 */
export function resolveAuction(bids: AuctionBidForResolution[], minBid: number): AuctionResolution {
  const eligible = bids.filter(b => b.amount >= minBid);
  if (eligible.length === 0) {
    return { winnerBidId: null, winnerProfileId: null, winningAmount: 0, losingBidIds: bids.map(b => b.bidId) };
  }
  const sorted = [...eligible].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.createdAt - b.createdAt; // earlier bid wins ties
  });
  const winner = sorted[0];
  return {
    winnerBidId: winner.bidId,
    winnerProfileId: winner.profileId,
    winningAmount: winner.amount,
    losingBidIds: bids.filter(b => b.bidId !== winner.bidId).map(b => b.bidId),
  };
}

/** Split a winning bid into the governor's cut and the burned remainder. */
export function splitAuctionProceeds(winningAmount: number, hasGovernor: boolean): { governorCut: number; burned: number } {
  const governorCut = hasGovernor ? Math.round(winningAmount * GOVERNOR_BURN_SHARE) : 0;
  return { governorCut, burned: winningAmount - governorCut };
}

/** Whether `locationId` is a recognized orbital-slot pool at all — routes
 *  should reject auction creation for unknown locations. */
export function isSlotPoolLocation(locationId: string): boolean {
  return ORBITAL_SLOT_MAP.has(locationId);
}

// ─── Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O7): auction soft-close ───────
// A bid landing inside the final SOFT_CLOSE_WINDOW_MS extends the close by
// SOFT_CLOSE_EXTENSION_MS (capped at SOFT_CLOSE_MAX_EXTENSION_MS past the
// auction's original window) — last-second sniping becomes a strategy with
// counterplay (rivals get time to respond) rather than a timing gimmick.

export const SOFT_CLOSE_WINDOW_MS = 10 * 60 * 1000;
export const SOFT_CLOSE_EXTENSION_MS = 10 * 60 * 1000;
export const SOFT_CLOSE_MAX_EXTENSION_MS = 60 * 60 * 1000;

/**
 * New closesAt after a bid at `nowMs`. `openedAtMs` anchors the extension
 * cap (openedAt + AUCTION_WINDOW_MS + max extension). Returns the existing
 * closesAt unchanged when the bid is outside the soft-close window or the
 * cap is exhausted. Pure/deterministic.
 */
export function applySoftClose(closesAtMs: number, openedAtMs: number, nowMs: number): number {
  if (nowMs >= closesAtMs) return closesAtMs; // already closed — resolve path handles it
  if (closesAtMs - nowMs > SOFT_CLOSE_WINDOW_MS) return closesAtMs;
  const cap = openedAtMs + AUCTION_WINDOW_MS + SOFT_CLOSE_MAX_EXTENSION_MS;
  return Math.min(cap, closesAtMs + SOFT_CLOSE_EXTENSION_MS);
}

// ─── Wave M5 (§3.2 O5): predatory slot leasing — allowed, taxed ─────────────
// Leasing slots you don't build on is legitimate denial (the burned bid is
// a real carrying cost), but not a free lockout: unbuilt leases pay an
// escalating idle fee (10% of the winning bid per 30 days, burned) and
// auto-release at 90 days unbuilt — "ownership transfers at market-clearing
// prices" (canon) stays true because a denied rival can also just buy the
// lease on the transfer market. Enforced by orbital-slots/resolve.

export const SLOT_IDLE_FEE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
export const SLOT_IDLE_FEE_FRACTION = 0.10;
export const SLOT_IDLE_AUTO_RELEASE_MS = 90 * 24 * 60 * 60 * 1000;

export interface IdleFeeAssessment {
  /** Idle-fee intervals elapsed and not yet charged. */
  intervalsDue: number;
  /** Total fee due now (intervalsDue × 10% of leaseAmount), burned. */
  feeDue: number;
  /** When the charge cursor should advance to if feeDue is collected. */
  chargeCursorMs: number;
  /** ≥ 90 days unbuilt — the lease auto-releases back to the pool. */
  autoRelease: boolean;
}

/**
 * Assess idle fees for an ACTIVE lease with no completed building at its
 * location. Pure: caller decides "unbuilt" (server-side building scan) and
 * applies the charge/release. `lastIdleFeeAtMs` null = never charged (the
 * cursor starts at `startedAtMs`).
 */
export function assessIdleFees(
  lease: { startedAtMs: number; lastIdleFeeAtMs: number | null; leaseAmount: number },
  nowMs: number,
): IdleFeeAssessment {
  const cursor = lease.lastIdleFeeAtMs ?? lease.startedAtMs;
  const elapsed = Math.max(0, nowMs - cursor);
  const intervalsDue = Math.floor(elapsed / SLOT_IDLE_FEE_INTERVAL_MS);
  const feePerInterval = Math.round(Math.max(0, lease.leaseAmount) * SLOT_IDLE_FEE_FRACTION);
  return {
    intervalsDue,
    feeDue: intervalsDue * feePerInterval,
    chargeCursorMs: cursor + intervalsDue * SLOT_IDLE_FEE_INTERVAL_MS,
    autoRelease: nowMs - lease.startedAtMs >= SLOT_IDLE_AUTO_RELEASE_MS,
  };
}
