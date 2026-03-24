// ─── Space Tycoon: Server-Side Dynamic Market Pricing Engine ─────────────────
// All players share the same global market. Prices stored in PostgreSQL.
// Buys push prices up. Sells and mining push prices down.
// Prices decay toward base price when idle.

import { RESOURCES, RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';

// ─── Price Impact Calculations ───────────────────────────────────────────────

/**
 * Market depth: how many units to move price by ~100% of base.
 * Inversely proportional to volatility.
 */
export function getMarketDepth(volatility: number): number {
  return Math.max(10, Math.round(10 / volatility));
}

/**
 * Calculate new price after a trade.
 * Buys push price up; sells push price down.
 */
export function calculatePriceAfterTrade(
  currentPrice: number,
  basePrice: number,
  quantity: number,
  isBuy: boolean,
  volatility: number,
  minPrice: number,
  maxPrice: number,
): number {
  const depth = getMarketDepth(volatility);
  const impactPct = (quantity / depth) * volatility * 10;
  const direction = isBuy ? 1 : -1;
  const newPrice = currentPrice * (1 + impactPct * direction);
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

/**
 * Apply mining supply pressure (gentler than direct trades).
 * Mining adds 1/3 of normal sell pressure per unit mined.
 */
export function calculatePriceAfterMining(
  currentPrice: number,
  basePrice: number,
  quantity: number,
  volatility: number,
  minPrice: number,
  maxPrice: number,
): number {
  const depth = getMarketDepth(volatility);
  const impactPct = (quantity / depth) * volatility * 10 * 0.33; // 1/3 of trade impact
  const newPrice = currentPrice * (1 - impactPct);
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

/**
 * Decay price toward base price when idle.
 * Called periodically (e.g., every few minutes by cron).
 */
export function calculateIdleDecay(
  currentPrice: number,
  basePrice: number,
  minutesSinceLastTrade: number,
  minPrice: number,
  maxPrice: number,
): number {
  if (minutesSinceLastTrade < 5) return currentPrice; // No decay in first 5 minutes
  // 0.5% per minute of idle, capped at 10% per call
  const decayRate = Math.min(0.10, 0.005 * minutesSinceLastTrade);
  const newPrice = currentPrice + (basePrice - currentPrice) * decayRate;
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

// ─── Supply-Based Pricing ──────────────────────────────────────────────────

/** Minimum units always available on the market (at extreme scarcity premium) */
export const MINIMUM_MARKET_SUPPLY = 100;

/**
 * Calculate price multiplier based on current supply vs baseline.
 * Low supply → high multiplier (scarcity premium).
 * High supply → low multiplier (abundance discount).
 *
 * At baseline supply: 1.0x
 * At 50% supply: ~1.4x
 * At 25% supply: ~2.0x
 * At minimum (100 units for rare, proportionally lower for common): ~3-5x
 * At 200% supply: ~0.7x
 * At 500% supply: ~0.45x
 */
export function getSupplyPriceMultiplier(
  currentSupply: number,
  baselineSupply: number,
): number {
  if (baselineSupply <= 0) return 1;
  // Ensure supply never goes below minimum for pricing purposes
  const effectiveSupply = Math.max(currentSupply, 1);
  // Inverse square root scaling — gentler than pure inverse, steeper than linear
  const ratio = baselineSupply / effectiveSupply;
  const multiplier = Math.sqrt(ratio);
  // Clamp between 0.3x (massive oversupply) and 10x (extreme scarcity)
  return Math.max(0.3, Math.min(10.0, multiplier));
}

/**
 * Get the effective market price accounting for supply levels.
 */
export function getSupplyAdjustedPrice(
  basePrice: number,
  currentSupply: number,
  baselineSupply: number,
  minPrice: number,
  maxPrice: number,
): number {
  const supplyMult = getSupplyPriceMultiplier(currentSupply, baselineSupply);
  const adjusted = Math.round(basePrice * supplyMult);
  return Math.max(minPrice, Math.min(maxPrice, adjusted));
}

/**
 * Calculate available quantity for purchase. Always at least MINIMUM_MARKET_SUPPLY
 * but anything below actual supply is at extreme premium pricing.
 */
export function getAvailableForPurchase(currentSupply: number): number {
  return Math.max(MINIMUM_MARKET_SUPPLY, currentSupply);
}

/**
 * Calculate NPC restock amount based on time elapsed and restock rate.
 * NPC restocking is gradual — prevents market from going permanently dry.
 * Supply is capped at 2x the baseline to prevent infinite buildup.
 */
export function calculateNPCRestock(
  currentSupply: number,
  baselineSupply: number,
  restockPerHour: number,
  hoursElapsed: number,
): number {
  const maxSupply = baselineSupply * 2; // Cap at 2x baseline
  if (currentSupply >= maxSupply) return 0;
  const restock = Math.floor(restockPerHour * hoursElapsed);
  return Math.min(restock, maxSupply - currentSupply);
}

// ─── Balance Reference ───────────────────────────────────────────────────────
//
// RESOURCE          BASE      DEPTH    MINING/MO    SELL IMPACT/MO
// iron              $5K       500      750          -$225/unit (gentle)
// aluminum          $8K       333      80           -$640/unit
// titanium          $25K      200      35           -$1.5K/unit
// lunar_water       $50K      333      300          -$2.5K/unit
// platinum_group    $500K     125      10           -$13K/unit
// gold              $300K     167      15           -$5.4K/unit
// rare_earth        $200K     143      23           -$3.2K/unit
// methane           $15K      250      300          -$600/unit
// ethane            $20K      200      150          -$1K/unit
// exotic_materials  $2M       67       5            -$150K/unit
// helium3           $5M       83       2            -$200K/unit
//
// Key insight: abundant resources (iron, methane) have high depth so
// large mining volumes barely move price. Rare resources (exotic, he3)
// have low depth so even small volumes cause big swings.
