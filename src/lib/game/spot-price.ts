// ─── Space Tycoon: One Price Truth — live spot price (Wave E2) ───────────────
// docs/ECONOMY_PVP_2026-08.md §2.5 ("one price truth"). Pure, client-safe
// module (no prisma imports) so both the SERVER (sync/route.ts, which reads
// the shared MarketResource rows) and the deterministic CLIENT tick
// (delivery-contracts.ts, npc-engine.ts — which read the last-synced
// snapshot) share ONE spot definition.
//
// Before this wave the game had "three price surfaces that never meet"
// (§1c): the shared MarketResource.currentPrice moved on trades/flows but
// nothing downstream read it, while contracts, NPC settlement, and
// mega-project contributions all valued resources at the STATIC
// baseMarketPrice constant. This module is the single spot function every
// one of those surfaces now routes through.

import { PRICE_BAND_LOW, PRICE_BAND_HIGH } from './price-band';

/**
 * The bounded market snapshot the server sends to each client every sync
 * (additive sync-down field). Values are already band-clamped server-side
 * before send, so a hostile client can neither be fed nor forge an absurd
 * spot — and a forged snapshot only mis-renders THAT client's private
 * contract/NPC valuations, which the sync-route plausibility clamp (§E1 #5)
 * then bounds.
 *
 * `prices` — live band-clamped spot per resource slug.
 * `base`   — the static baseMarketPrice per slug, for deviation display /
 *            reference-line rendering (the anchor the spot is clamped to).
 * `asOf`   — server timestamp the snapshot was computed at.
 */
export interface MarketSnapshot {
  prices: Record<string, number>;
  base?: Record<string, number>;
  asOf: number;
}

/**
 * Clamp a raw price into the anti-cornering band around the reference/base
 * price — `[base × 0.3, base × 3.0]` (price-band.ts constants) — further
 * intersected with the resource's hard min/max. This is the bound that makes
 * cornering *possible but expensive*: no corner can push the valuation a
 * downstream surface pays above base × 3 (Earth-import parity, §3.2, backs
 * this on the trade side).
 */
export function clampSpotToBand(
  price: number,
  basePrice: number,
  minPrice: number,
  maxPrice: number,
): number {
  const bandMin = Math.max(minPrice, Math.round(basePrice * PRICE_BAND_LOW));
  const bandMax = Math.min(maxPrice, Math.round(basePrice * PRICE_BAND_HIGH));
  const lo = Math.min(bandMin, bandMax);
  const hi = Math.max(bandMin, bandMax);
  return Math.max(lo, Math.min(hi, Math.round(price)));
}

/**
 * Compute the canonical live spot for a resource from the shared market row.
 *
 * Spot signal = the most recent real price-discovery available:
 *   1. the last order-book fill price (truest — an actual player trade), else
 *   2. the maintained MarketResource.currentPrice (which already integrates
 *      order fills, mining/NPC background flows, and the hourly mean-revert
 *      cron toward the seasonally-biased base).
 * The signal is then band-clamped (anti-cornering). Deterministic and cheap —
 * this runs once per resource per sync.
 *
 * In production today MarketFill has zero rows, so `currentPrice` is the live
 * truth; once the book has volume the last fill leads.
 */
export function computeSpotPrice(input: {
  currentPrice: number;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  lastFillPrice?: number | null;
}): number {
  const { currentPrice, basePrice, minPrice, maxPrice, lastFillPrice } = input;
  const fill =
    typeof lastFillPrice === 'number' && Number.isFinite(lastFillPrice) && lastFillPrice > 0
      ? lastFillPrice
      : null;
  const cur =
    typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0
      ? currentPrice
      : basePrice;
  const raw = fill ?? cur;
  return clampSpotToBand(raw, basePrice, minPrice, maxPrice);
}

/**
 * Read the live spot for a resource out of a client-held snapshot. Returns
 * `fallback` (default `null`) when the snapshot is absent or doesn't carry
 * that slug — the caller then decides whether to fall back to base pricing
 * (solo / never-synced players) or skip repricing.
 */
export function getSpotPrice(
  snapshot: MarketSnapshot | null | undefined,
  resourceId: string,
  fallback: number | null = null,
): number | null {
  if (!snapshot || !snapshot.prices) return fallback;
  const v = snapshot.prices[resourceId];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Fractional deviation of spot from its base reference, e.g. +0.20 = spot is
 *  20% above base. Returns 0 when base is non-positive. */
export function spotDeviation(spot: number, basePrice: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  return (spot - basePrice) / basePrice;
}

/** Row shape the server passes in (a subset of the MarketResource columns). */
export interface SpotSourceRow {
  slug: string;
  currentPrice: number;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  lastFillPrice?: number | null;
}

/**
 * Build the sync-down snapshot from the shared MarketResource rows. Server
 * helper — keeps the spot definition out of the route so it stays testable
 * without a database.
 */
export function buildMarketSnapshot(rows: SpotSourceRow[], asOf: number = Date.now()): MarketSnapshot {
  const prices: Record<string, number> = {};
  const base: Record<string, number> = {};
  for (const r of rows) {
    if (!r || typeof r.slug !== 'string') continue;
    prices[r.slug] = computeSpotPrice({
      currentPrice: r.currentPrice,
      basePrice: r.basePrice,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      lastFillPrice: r.lastFillPrice ?? null,
    });
    base[r.slug] = Math.round(r.basePrice);
  }
  return { prices, base, asOf };
}
