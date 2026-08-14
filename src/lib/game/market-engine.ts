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
 * Trade price-impact coefficient (audit Wave E — A5-v "tame volatility:
 * impact `qty×vol²` → `qty×vol×k` with per-trade clamp"). The old algebra
 * collapsed to qty × volatility² — fine for iron (vol 0.02 → 0.04%/unit)
 * but "absurdly twitchy" for rare commodities: 100 helium-3 (vol 0.12) was
 * a 144% move → instant floor (audit §5). With k = 0.02 the common-metal
 * impact is UNCHANGED (0.02 × 0.02 ≡ 0.02² for iron) while helium-3 drops
 * to 0.24%/unit, and no single trade can move a price more than ±25%.
 */
export const TRADE_IMPACT_K = 0.02;

/** Per-trade price-impact clamp (A5-v). */
export const MAX_TRADE_IMPACT = 0.25;

/** Per-call clamp for background flows (mining / NPC) — gentler than trades. */
export const MAX_BACKGROUND_IMPACT = 0.10;

/**
 * Calculate new price after a trade.
 * Buys push price up; sells push price down.
 * Impact = qty × volatility × k, clamped at ±25% per trade (audit A5-v).
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
  const impactPct = Math.min(MAX_TRADE_IMPACT, quantity * volatility * TRADE_IMPACT_K);
  const direction = isBuy ? 1 : -1;
  const newPrice = currentPrice * (1 + impactPct * direction);
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

/**
 * Apply mining supply pressure (gentler than direct trades).
 * Mining adds 1/3 of normal sell pressure per unit mined (BALANCE.md
 * "mining pressure at 1/3 … audited in Wave 4 and found sound" — the 1/3
 * ratio is kept; only the underlying impact curve is tamed per A5-v).
 * Audit §1d-5: this is the "mass extraction depresses prices" path — the
 * client now actually sends minedThisTick via sync (see market-pressure.ts).
 */
export function calculatePriceAfterMining(
  currentPrice: number,
  basePrice: number,
  quantity: number,
  volatility: number,
  minPrice: number,
  maxPrice: number,
): number {
  const impactPct = Math.min(MAX_BACKGROUND_IMPACT, quantity * volatility * TRADE_IMPACT_K * 0.33);
  const newPrice = currentPrice * (1 - impactPct);
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

/**
 * Apply a signed background market flow (audit Wave E — A5-iv: the NPC
 * market-pressure accumulator was "write-only … the entire NPC buy/sell
 * tuning ('gentle nudges, not crashes') is inert"). Positive quantity =
 * supply added (NPC sells) → price down; negative = NPC buys → price up.
 * Same 1/3-of-trade gentleness as mining, same per-call clamp.
 */
export function calculatePriceAfterBackgroundFlow(
  currentPrice: number,
  basePrice: number,
  signedQuantity: number,
  volatility: number,
  minPrice: number,
  maxPrice: number,
): number {
  if (!Number.isFinite(signedQuantity) || signedQuantity === 0) return currentPrice;
  const impactPct = Math.min(MAX_BACKGROUND_IMPACT, Math.abs(signedQuantity) * volatility * TRADE_IMPACT_K * 0.33);
  const direction = signedQuantity > 0 ? -1 : 1; // supply in → down; demand → up
  const newPrice = currentPrice * (1 + impactPct * direction);
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

/**
 * Decay price toward base price when idle — MEAN REVERSION.
 *
 * Audit Wave E (A5-ii): this function had "zero callers and no cron touches
 * currentPrice … a dumped price stays dumped forever" (audit §5). It is now
 * called hourly by /api/space-tycoon/market/mean-revert (cron-scheduler
 * 'tycoon-market-mean-revert'). At the hourly cadence each call moves the
 * price ≤10% of the gap toward base (the 0.5%/min rate caps out past 20
 * idle minutes), giving a reversion half-life of ~6.6 real hours ≈ one
 * game-month — crashes and squeezes are tradeable for a session, then the
 * market heals. Trades within the last 5 minutes suppress decay so active
 * price discovery isn't fought by the cron.
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
 * Broker commission on sell-side trades (buy-side is unaffected — the premium
 * is already baked into the supply multiplier).
 *
 * 3% sink per sale. Prevents frictionless mine → sell loops from being pure
 * profit, creates a realistic commodities-market feel, and adds ongoing
 * downward pressure to raw-resource revenue at scale.
 *
 * Magnate commanders reduce this fee via the marketPriceMultiplier bonus,
 * now applied SERVER-SIDE in market/trade/route.ts via
 * getEffectiveBrokerFeeRate (audit Wave B, §1c "commanders
 * marketPriceMultiplier — never cuts the broker fee").
 */
export const MARKET_BROKER_FEE_RATE = 0.03;

/**
 * Effective sell-side broker fee rate after per-player reductions
 * (audit Wave B — Change #2):
 * - §1c: Magnate commander `marketPriceMultiplier` (each point above 1.0 is
 *   a matching fractional fee cut, capped at 50%).
 * - A8: espionage `trade_route_intel` reward — temporary market-fee
 *   discount on the target's traded resources.
 * - A2: alliance diplomacy trade agreements (`tradeBonus` = fee reduction,
 *   e.g. 0.02 = -2% fee per the treaty definition).
 *
 * Reductions are additive and the total is capped at 85% so the fee sink
 * never fully disappears (BALANCE.md Wave 4: the fee is a designed sink).
 * Pure + deterministic — unit-tested in audit-wave-b-wiring.test.ts.
 */
export function getEffectiveBrokerFeeRate(opts: {
  baseRate?: number;
  commanderMarketMultiplier?: number;
  espionageDiscount?: number;
  diplomacyTradeBonus?: number;
  /**
   * 4X Wave W11 (accord-senate.ts / STATS_DESIGN.md §12 "Standing tiers
   * modify prices"): a SIGNED modifier from faction standing —
   * factions.getFactionStandingBrokerModifier(rep). Positive = discount
   * (allied/friendly, folded into the same cut stack as commander/
   * espionage/diplomacy below); negative = surcharge (unfriendly/hostile —
   * the one caller-supplied input that can push the effective rate ABOVE
   * base). Optional and defaults to 0, so every existing caller/test that
   * omits it is byte-for-byte unchanged.
   */
  factionStandingModifier?: number;
}): number {
  const base = opts.baseRate ?? MARKET_BROKER_FEE_RATE;
  const clampFrac = (v: number | undefined, cap: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(cap, v)) : 0;
  const commanderCut = clampFrac((opts.commanderMarketMultiplier ?? 1) - 1, 0.50);
  const espionageCut = clampFrac(opts.espionageDiscount, 0.50);
  const diplomacyCut = clampFrac(opts.diplomacyTradeBonus, 0.50);
  const totalCut = Math.min(0.85, commanderCut + espionageCut + diplomacyCut);
  // Faction standing applies AFTER the discount-only stack above, as its own
  // signed multiplier — capped to STATS_DESIGN §12's stated tier range
  // (+15% allied discount .. -25% hostile surcharge) regardless of what the
  // caller passes, so a bad input can never zero out or invert the fee.
  const standingMod = Math.max(-0.25, Math.min(0.15, opts.factionStandingModifier ?? 0));
  const rate = base * (1 - totalCut) * (1 - standingMod);
  return Math.max(0, rate);
}

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
