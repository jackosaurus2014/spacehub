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
