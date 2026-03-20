// ─── Space Tycoon: Market Engine ────────────────────────────────────────────
// Dynamic pricing based on aggregate supply/demand from all players.
// Prices move toward equilibrium with bounded volatility.

/**
 * Calculate a new price based on supply/demand imbalance.
 *
 * @param currentPrice - Current price per unit
 * @param basePrice - Equilibrium price (prices decay toward this when idle)
 * @param totalSupply - Aggregate units available from sellers
 * @param totalDemand - Aggregate units wanted by buyers
 * @param volatility - Sensitivity factor (0.01 = stable, 0.15 = volatile)
 * @param minPrice - Price floor
 * @param maxPrice - Price ceiling
 * @param minutesSinceLastOrder - For idle decay
 */
export function calculateNewPrice(
  currentPrice: number,
  basePrice: number,
  totalSupply: number,
  totalDemand: number,
  volatility: number,
  minPrice: number,
  maxPrice: number,
  minutesSinceLastOrder: number = 0,
): number {
  // Supply/demand pressure
  const ratio = totalDemand / Math.max(totalSupply, 1);
  const pressure = Math.max(-0.5, Math.min(0.5, ratio - 1.0));
  let newPrice = currentPrice * (1 + pressure * volatility);

  // Decay toward base price when market is idle (no orders in 30+ min)
  if (minutesSinceLastOrder > 30) {
    const decay = Math.min(0.2, 0.01 * minutesSinceLastOrder / 60);
    newPrice = newPrice + (basePrice - newPrice) * decay;
  }

  // Clamp to bounds
  return Math.max(minPrice, Math.min(maxPrice, Math.round(newPrice)));
}

/**
 * Process a trade order and calculate price impact.
 *
 * @param type - "buy" or "sell"
 * @param quantity - Number of units
 * @param currentPrice - Current price per unit
 * @param totalSupply - Current supply
 * @param totalDemand - Current demand
 * @returns New supply/demand values and order cost
 */
export function processTradeOrder(
  type: 'buy' | 'sell',
  quantity: number,
  currentPrice: number,
  totalSupply: number,
  totalDemand: number,
): {
  totalCost: number;
  newSupply: number;
  newDemand: number;
} {
  const totalCost = Math.round(quantity * currentPrice);

  if (type === 'buy') {
    return {
      totalCost,
      newSupply: Math.max(0, totalSupply - quantity),
      newDemand: totalDemand + quantity,
    };
  } else {
    return {
      totalCost,
      newSupply: totalSupply + quantity,
      newDemand: Math.max(0, totalDemand - quantity),
    };
  }
}

/**
 * Calculate net worth from resources at market prices.
 */
export function calculateResourceValue(
  resources: Record<string, number>,
  prices: Record<string, number>,
): number {
  let total = 0;
  for (const [resourceId, quantity] of Object.entries(resources)) {
    const price = prices[resourceId] || 0;
    total += quantity * price;
  }
  return Math.round(total);
}
