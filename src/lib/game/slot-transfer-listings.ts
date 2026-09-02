// ─── Space Tycoon: orbital-slot lease transfer listings ──────────────────────
// docs/SECURITY_AUDIT_2026-09.md "Game exploit batch 2026-09-02" (C-3).
//
// The old `action:'transfer'` let the SELLER name a buyer by companyName and
// a price, and debited that buyer on the spot — a non-consenting party paid
// an attacker-chosen figure, and the 400 "Buyer has insufficient funds" was a
// balance oracle. Transfers are now two-phase:
//
//   list   — the holder posts an asking price (banded around the lease's
//            reference price) and optionally pins a buyer profileId;
//   accept — the BUYER's own session pays. Debit and credit run in one
//            transaction through the server ledger.
//
// OrbitalSlotLease has no Json column and schema changes are out of scope
// for this batch, so listings live in this bounded in-memory registry
// (24 h TTL, per-instance). A redeploy drops open listings — the seller
// simply relists. A durable version needs a schema column:
// `OrbitalSlotLease.askingPrice Float?` + `listedAt DateTime?` +
// `listedForProfileId String?` (see the audit doc's follow-ups).

import { computeMinBid } from './orbital-slot-auctions';

export interface SlotTransferListing {
  leaseId: string;
  sellerProfileId: string;
  locationId: string;
  askingPrice: number;
  /** When set, only this profile may accept. */
  toProfileId: string | null;
  createdAtMs: number;
  expiresAtMs: number;
}

export const SLOT_LISTING_TTL_MS = 24 * 3600_000;
export const SLOT_LISTING_MAX = 5_000;
/** Asking price must sit within [LOW x, HIGH x] of the lease's reference. */
export const SLOT_LISTING_BAND_LOW = 0.5;
export const SLOT_LISTING_BAND_HIGH = 3;

const listings = new Map<string, SlotTransferListing>();

function sweep(nowMs: number): void {
  for (const [id, l] of Array.from(listings.entries())) {
    if (l.expiresAtMs <= nowMs) listings.delete(id);
  }
  if (listings.size >= SLOT_LISTING_MAX) {
    const oldest = Array.from(listings.entries()).sort((a, b) => a[1].createdAtMs - b[1].createdAtMs);
    for (const [id] of oldest.slice(0, Math.ceil(oldest.length / 4))) listings.delete(id);
  }
}

/** Reference price for the band: the lease's last price when it has one,
 *  else the pool's current minimum bid. */
export function listingReferencePrice(locationId: string, leaseAmount: number): number {
  const last = Number.isFinite(leaseAmount) && leaseAmount > 0 ? leaseAmount : 0;
  return last > 0 ? last : computeMinBid(locationId);
}

export function listingPriceBand(locationId: string, leaseAmount: number): { min: number; max: number; reference: number } {
  const reference = listingReferencePrice(locationId, leaseAmount);
  return {
    reference,
    min: Math.max(1, Math.round(reference * SLOT_LISTING_BAND_LOW)),
    max: Math.round(reference * SLOT_LISTING_BAND_HIGH),
  };
}

export function putListing(
  args: { leaseId: string; sellerProfileId: string; locationId: string; askingPrice: number; toProfileId?: string | null },
  nowMs: number = Date.now(),
): SlotTransferListing {
  sweep(nowMs);
  const listing: SlotTransferListing = {
    leaseId: args.leaseId,
    sellerProfileId: args.sellerProfileId,
    locationId: args.locationId,
    askingPrice: Math.round(args.askingPrice),
    toProfileId: args.toProfileId || null,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + SLOT_LISTING_TTL_MS,
  };
  listings.set(args.leaseId, listing);
  return listing;
}

export function getListing(leaseId: string, nowMs: number = Date.now()): SlotTransferListing | null {
  const l = listings.get(leaseId);
  if (!l) return null;
  if (l.expiresAtMs <= nowMs) {
    listings.delete(leaseId);
    return null;
  }
  return l;
}

export function removeListing(leaseId: string): void {
  listings.delete(leaseId);
}

/** Open listings (unexpired), optionally only those this profile may accept. */
export function listOpenListings(forProfileId?: string, nowMs: number = Date.now()): SlotTransferListing[] {
  sweep(nowMs);
  return Array.from(listings.values())
    .filter(l => l.expiresAtMs > nowMs)
    .filter(l => !forProfileId || !l.toProfileId || l.toProfileId === forProfileId)
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .slice(0, 200);
}

/** Test helper. */
export function __resetSlotTransferListings(): void {
  listings.clear();
}
