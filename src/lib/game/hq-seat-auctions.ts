// ─── Space Tycoon: HQ seat auctions — the PURE half (CC-3) ──────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2: "Seats are scarce … sold
// through the existing orbital-slot auctions and lease mechanics … ownership
// transfers at market-clearing prices."
//
// CC-2 gave LEO and Luna a first-come lease at a posted, occupancy-indexed
// price. From Mars outward the pools are 8 seats or fewer and a posted price
// is not price discovery — it is a race condition. Those stages
// (headquarters.ts HQ_AUCTION_STAGES) sell a vacant seat at a SEALED-BID
// auction instead.
//
// REUSE: the resolution math is the orbital-slot auction's, imported, not
// copied — resolveAuction (highest amount wins, ties to the earliest bid, no
// RNG, reproducible) and the soft-close constants. What could NOT be reused
// is the orbital-slot *storage*: OrbitalSlotAuction is keyed by locationId
// against a per-location occupancy bucket, its leases carry building-tied
// idle fees, and a corporation may hold several. An HQ seat is one
// indivisible anchorage, at most one per corporation, held by the
// headquarters itself with no building to idle against, and its pool is the
// HqSeat table CC-2 already built. Sharing the table would have meant a
// nullable seatId on OrbitalSlotAuction plus an "is this an HQ row?" branch
// in every orbital-slot reader — more coupling than the ~60 lines of I/O it
// would have saved. The BEHAVIOUR is the same auction; only the rows differ.
//
// Time loop: WEEKLY-tempo price discovery on a 48-hour window (8 game-months
// of world time) with a 10-minute soft close, resolved by the same
// assets-complete cron family that completes relocations. Server I/O lives
// in hq-relocation-server.ts; the route is /api/space-tycoon/hq/seat-auction.

import {
  SOFT_CLOSE_WINDOW_MS,
  SOFT_CLOSE_EXTENSION_MS,
  SOFT_CLOSE_MAX_EXTENSION_MS,
  resolveAuction,
  type AuctionBidForResolution,
  type AuctionResolution,
} from './orbital-slot-auctions';
import { HQ_SEAT_COUNTS, hqSeatIsAuctioned, type HqStageId } from './headquarters';
import { postedSeatPrice } from './hq-relocation';

export type { AuctionBidForResolution, AuctionResolution };

/** How long a seat auction runs before the cron resolves it. Two real days:
 *  long enough that a rival in another time zone gets one waking chance to
 *  contest, short enough that a corporation ready to move its headquarters
 *  is not parked for a week. (The orbital-slot pools use 7 days because a
 *  lease there is one of many; an HQ seat blocks the corporation's whole
 *  campaign-loop move.) */
export const HQ_SEAT_AUCTION_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Minimum increment over the standing high bid, so an auction cannot be
 *  won by a dollar and cannot be ground out in cent-sized revisions. */
export const HQ_SEAT_BID_INCREMENT = 0.02;

export const HQ_SEAT_AUCTION_OPEN = 'open';
export const HQ_SEAT_AUCTION_RESOLVED = 'resolved';
export const HQ_SEAT_AUCTION_EXPIRED = 'expired';

export const HQ_SEAT_BID_OPEN = 'open';
export const HQ_SEAT_BID_WON = 'won';
export const HQ_SEAT_BID_REFUNDED = 'refunded';

/** The reserve an auction opens at: the pool's posted price at the current
 *  occupancy (hq-relocation.ts postedSeatPrice) — the same scarcity curve
 *  CC-2 charges at LEO and Luna, now acting as the floor rather than the
 *  price. Rounded to $0.1M by postedSeatPrice. */
export function hqAuctionReserve(stage: HqStageId, occupied: number, total: number = HQ_SEAT_COUNTS[stage]): number {
  return postedSeatPrice(stage, occupied, total);
}

/** The smallest bid that can be entered now: the reserve when nobody has
 *  bid, else the standing high bid plus the increment. Rounded up to $0.1M
 *  so the number a player is shown is the number the server accepts. */
export function hqMinimumBid(reserve: number, highBid: number): number {
  const floor = Math.max(0, reserve);
  const raised = highBid > 0 ? highBid * (1 + HQ_SEAT_BID_INCREMENT) : 0;
  return Math.ceil(Math.max(floor, raised) / 100_000) * 100_000;
}

/** A bid is admissible when it clears the current minimum. */
export function isAdmissibleHqBid(amount: number, reserve: number, highBid: number): boolean {
  return Number.isFinite(amount) && amount >= hqMinimumBid(reserve, highBid);
}

/** New closesAt after a bid lands. Same soft-close rule as the orbital-slot
 *  auctions (a bid inside the last 10 minutes buys everyone 10 more), with
 *  the cap anchored on THIS auction's window. */
export function hqAuctionSoftClose(closesAtMs: number, openedAtMs: number, nowMs: number): number {
  if (nowMs >= closesAtMs) return closesAtMs;
  if (closesAtMs - nowMs > SOFT_CLOSE_WINDOW_MS) return closesAtMs;
  const cap = openedAtMs + HQ_SEAT_AUCTION_WINDOW_MS + SOFT_CLOSE_MAX_EXTENSION_MS;
  return Math.min(cap, closesAtMs + SOFT_CLOSE_EXTENSION_MS);
}

/**
 * Resolve a seat auction. Delegates to the orbital-slot auction's
 * resolveAuction so the two systems can never drift apart on "who won":
 * highest amount ≥ reserve wins, ties break to the earliest bid, no bid at
 * or above the reserve means no winner and the auction expires. Every
 * non-winning bid is refunded in full; the winner's bid is BURNED.
 */
export function resolveHqSeatAuction(bids: AuctionBidForResolution[], reserve: number): AuctionResolution {
  return resolveAuction(bids, reserve);
}

/** Guard for the one invariant the whole system rests on (design §8 call 2,
 *  "one HQ per corporation"): a corporation may never end up holding two
 *  seats. Used by the bid route (refuse a bid from a corporation already
 *  seated elsewhere at an auction stage it is not moving to) and by the
 *  award path (release everything else in the same transaction). */
export function hqSeatConflict(
  heldStages: readonly string[],
  targetStage: HqStageId,
): { conflict: boolean; heldAt: string | null } {
  const other = heldStages.find(s => s && s !== targetStage) ?? null;
  return { conflict: !!other, heldAt: other };
}

/** Whether a stage's vacant seats are auctioned at all (re-exported so
 *  callers need one import, not two). */
export { hqSeatIsAuctioned };
