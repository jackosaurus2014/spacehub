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
