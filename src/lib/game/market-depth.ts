// ─── Space Tycoon: Market Depth v1 ───────────────────────────────────────────
// Per STATS_DESIGN.md Phase V. Adds bid-ask spread visibility, a futures-
// contract model for time-locked price promises, and the scaffolding for
// short selling (position-tracking type only — execution is v2).
//
// The existing market-engine.ts already models price reaction to trades
// and idle decay; Phase V is presentational + structural. Short-selling
// execution (borrow, mark-to-market, margin calls) is intentionally
// deferred to avoid shipping half a mechanic.

import type { GameState } from './types';
import type { ResourceId } from './resources';
import { RESOURCE_MAP } from './resources';
import { MARKET_BROKER_FEE_RATE, getSupplyPriceMultiplier } from './market-engine';
import { validateFuturesStrike } from './price-band';

// ─── Bid / Ask spread ────────────────────────────────────────────────────────

export interface BidAskQuote {
  resourceSlug: string;
  spotPrice: number;         // neutral midpoint
  bid: number;               // what market pays the seller (net of broker fee)
  ask: number;               // what buyer pays (includes scarcity premium)
  spread: number;            // ask - bid
  spreadPct: number;         // spread / spot
  supplyMultiplier: number;  // current scarcity factor
  volatility: number;        // from MarketResource
}

/**
 * Compute the visible bid-ask spread for a single commodity.
 *
 * Market mechanics driving the spread:
 *   - Buyers pay: spotPrice × supplyMultiplier  (scarcity premium)
 *   - Sellers get: spotPrice × (1 - brokerFeeRate)  (broker takes 3%)
 *   - Volatility widens the spread multiplicatively — illiquid commodities
 *     have wider quotes (market-maker risk premium).
 */
export function computeBidAsk(params: {
  currentPrice: number;
  basePrice: number;
  totalSupply: number;
  baselineSupply: number;
  volatility: number;
}): BidAskQuote & { resourceSlug: string; _tag?: never } {
  const supplyMult = getSupplyPriceMultiplier(params.totalSupply, params.baselineSupply);
  // Bid = spot × (1 − broker fee) × (1 − volatility × 0.5)
  const bid = Math.round(params.currentPrice * (1 - MARKET_BROKER_FEE_RATE) * (1 - params.volatility * 0.5));
  // Ask = spot × supplyMultiplier × (1 + volatility × 0.3)
  const ask = Math.round(params.currentPrice * supplyMult * (1 + params.volatility * 0.3));
  const spread = ask - bid;
  return {
    resourceSlug: '',
    spotPrice: params.currentPrice,
    bid,
    ask,
    spread,
    spreadPct: params.currentPrice > 0 ? spread / params.currentPrice : 0,
    supplyMultiplier: supplyMult,
    volatility: params.volatility,
  };
}

// ─── Futures contracts ───────────────────────────────────────────────────────

export type FuturesDirection = 'long' | 'short';

/** A futures contract is a binding promise: at `expiresAtMs`, the holder
 *  pays (if long) or receives (if short) `strikePrice` × `quantity` for
 *  `quantity` units of `resourceSlug`. Settled against the spot price at
 *  expiry. Used to hedge price risk on mining / supply contracts. */
export interface FuturesContract {
  id: string;
  holderProfileId?: string;
  resourceSlug: ResourceId;
  quantity: number;
  strikePrice: number;      // $/unit locked at contract open
  direction: FuturesDirection;
  /** Margin locked at contract open — e.g. 10% of notional as collateral. */
  marginLocked: number;
  openedAtMs: number;
  expiresAtMs: number;
  /** Set on settlement. */
  settledAtMs?: number;
  /** Profit/loss at settlement (positive = profit to holder). */
  settlementPnL?: number;
  status: 'open' | 'settled' | 'liquidated';
}

/** Standard margin rate for new futures — 10% of contract notional locked. */
export const FUTURES_MARGIN_RATE = 0.10;

export function computeMargin(quantity: number, strikePrice: number): number {
  return Math.round(quantity * strikePrice * FUTURES_MARGIN_RATE);
}

/**
 * Validate a proposed futures strike price against the same price band the
 * server order book enforces (audit A6 / hotlist #2): the strike must sit
 * within [ref × 0.3, ref × 3.0] clamped to the resource's hard min/max,
 * where ref is the live spot price when known, else the static base price.
 * Before this check, a short at a fantasy strike (e.g. $50M vs a $5K spot)
 * was a guaranteed money printer at settlement.
 */
export function checkFuturesStrike(
  resourceSlug: ResourceId,
  strikePrice: number,
  spotPrice?: number | null,
): { valid: boolean; min: number; max: number } {
  const def = RESOURCE_MAP.get(resourceSlug);
  if (!def) return { valid: false, min: 0, max: 0 };
  return validateFuturesStrike(strikePrice, {
    baseMarketPrice: def.baseMarketPrice,
    minPrice: def.minPrice,
    maxPrice: def.maxPrice,
    spotPrice,
  });
}

/**
 * Open a new futures contract. Locks margin from player money; if they can't
 * post margin — or the strike falls outside the allowed price band — the
 * contract is refused (state returned unchanged).
 */
export function openFutures(
  state: GameState,
  params: { resourceSlug: ResourceId; quantity: number; strikePrice: number; direction: FuturesDirection; expiresAtMs: number; spotPrice?: number | null },
  now: number = Date.now(),
): GameState {
  // Strike-price band enforcement (audit A6). Applies regardless of caller.
  if (!checkFuturesStrike(params.resourceSlug, params.strikePrice, params.spotPrice).valid) {
    return state;
  }
  if (!Number.isFinite(params.quantity) || params.quantity <= 0) return state;
  const margin = computeMargin(params.quantity, params.strikePrice);
  if (state.money < margin) return state;
  const contract: FuturesContract = {
    id: `fut-${now.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
    resourceSlug: params.resourceSlug,
    quantity: params.quantity,
    strikePrice: params.strikePrice,
    direction: params.direction,
    marginLocked: margin,
    openedAtMs: now,
    expiresAtMs: params.expiresAtMs,
    status: 'open',
  };
  return {
    ...state,
    money: state.money - margin,
    futuresContracts: [...(state.futuresContracts || []), contract],
  };
}

/**
 * Settle a single futures contract at given spot price. Return the new state
 * with margin released + PnL applied to cash, and the contract marked
 * 'settled' in the history.
 */
export function settleFutures(state: GameState, contractId: string, spotPrice: number, now: number = Date.now()): GameState {
  const contracts = state.futuresContracts || [];
  const contract = contracts.find(c => c.id === contractId);
  if (!contract || contract.status !== 'open') return state;

  // PnL = quantity × (spot − strike) × direction-sign
  // Long wins if spot > strike; short wins if spot < strike.
  const sign = contract.direction === 'long' ? 1 : -1;
  const pnl = Math.round(contract.quantity * (spotPrice - contract.strikePrice) * sign);
  const moneyBack = contract.marginLocked + pnl;

  const settled = {
    ...contract,
    status: 'settled' as const,
    settledAtMs: now,
    settlementPnL: pnl,
  };

  return {
    ...state,
    money: state.money + moneyBack,
    totalEarned: pnl > 0 ? state.totalEarned + pnl : state.totalEarned,
    totalSpent: pnl < 0 ? state.totalSpent - pnl : state.totalSpent,
    futuresContracts: contracts.map(c => c.id === contractId ? settled : c),
  };
}

/** Expire overdue contracts by settling each at current spot price. */
export function expireDueFutures(
  state: GameState,
  spotLookup: (slug: ResourceId) => number | null,
  now: number = Date.now(),
): GameState {
  const overdue = (state.futuresContracts || []).filter(c => c.status === 'open' && c.expiresAtMs <= now);
  let out = state;
  for (const c of overdue) {
    const spot = spotLookup(c.resourceSlug as ResourceId);
    if (spot === null) continue; // skip if price unknown
    out = settleFutures(out, c.id, spot, now);
  }
  return out;
}

/** Summary of open futures exposure — useful for risk dashboard. */
export function getOpenFuturesExposure(state: GameState): {
  openCount: number;
  longExposure: number;   // sum of long notional
  shortExposure: number;  // sum of short notional
  totalMargin: number;
} {
  const open = (state.futuresContracts || []).filter(c => c.status === 'open');
  let longExposure = 0, shortExposure = 0, totalMargin = 0;
  for (const c of open) {
    const notional = c.quantity * c.strikePrice;
    if (c.direction === 'long') longExposure += notional;
    else shortExposure += notional;
    totalMargin += c.marginLocked;
  }
  return { openCount: open.length, longExposure, shortExposure, totalMargin };
}
