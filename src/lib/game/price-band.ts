// ─── Space Tycoon: Shared price-band validation ──────────────────────────────
// Pure, client-safe module (no prisma imports). Extracted from
// market-orderbook.ts so the futures engine (market-depth.ts, which runs
// client-side) can enforce the SAME band the server order book enforces.
// Audit A6 / hotlist #2: futures strike prices were player-typed and
// unvalidated — a short at a fantasy strike was an infinite money printer.

/** Band bounds relative to the reference (base or spot) price. */
export const PRICE_BAND_LOW = 0.3; // 30% of reference price
export const PRICE_BAND_HIGH = 3.0; // 300% of reference price

export interface PriceBandResult {
  valid: boolean;
  min: number;
  max: number;
}

/**
 * Validate that a price is within the allowed band for a resource.
 * The band is [referencePrice × 0.3, referencePrice × 3.0], further clamped
 * to the resource's hard min/max prices.
 */
export function validatePriceBand(
  price: number,
  referencePrice: number,
  minPrice: number,
  maxPrice: number,
): PriceBandResult {
  const bandMin = Math.max(minPrice, Math.round(referencePrice * PRICE_BAND_LOW));
  const bandMax = Math.min(maxPrice, Math.round(referencePrice * PRICE_BAND_HIGH));
  return {
    valid: price >= bandMin && price <= bandMax,
    min: bandMin,
    max: bandMax,
  };
}

/**
 * Futures strike validation (audit A6). The reference is the live spot price
 * when known, otherwise the resource's static base market price. Rejects
 * non-finite / non-positive strikes outright.
 */
export function validateFuturesStrike(
  strike: number,
  params: { baseMarketPrice: number; minPrice: number; maxPrice: number; spotPrice?: number | null },
): PriceBandResult {
  if (!Number.isFinite(strike) || strike <= 0) {
    const band = validatePriceBand(0, params.spotPrice || params.baseMarketPrice, params.minPrice, params.maxPrice);
    return { valid: false, min: band.min, max: band.max };
  }
  const reference =
    typeof params.spotPrice === 'number' && Number.isFinite(params.spotPrice) && params.spotPrice > 0
      ? params.spotPrice
      : params.baseMarketPrice;
  return validatePriceBand(strike, reference, params.minPrice, params.maxPrice);
}
