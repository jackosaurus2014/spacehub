'use client';

import { useState, useEffect, useCallback } from 'react';
import { RESOURCE_MAP, RESOURCES } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import type { GameState } from '@/lib/game/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderLevel {
  price: number;
  totalQty: number;
  orderCount: number;
  isNpc: boolean;
}

interface OrderBookData {
  resourceSlug: string;
  currentPrice: number;
  basePrice: number;
  change24h: number;
  lastTradePrice: number | null;
  lastTradeAt: string | null;
  spread: { absolute: number; percentage: number } | null;
  volume24h: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
}

interface MyOrder {
  id: string;
  resourceSlug: string;
  side: string;
  price: number;
  quantity: number;
  filledQty: number;
  remainingQty: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  fills: { quantity: number; price: number; executedAt: string }[];
}

interface MarketOrderBookProps {
  state: GameState;
  selectedResource?: string;
  onOrderPlaced?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketOrderBook({ state, selectedResource, onOrderPlaced }: MarketOrderBookProps) {
  const [resource, setResource] = useState(selectedResource || 'iron');
  const [book, setBook] = useState<OrderBookData | null>(null);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'book' | 'place' | 'orders'>('book');

  // Order form state
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiresIn, setExpiresIn] = useState('24h');

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/space-tycoon/market/orders?resourceSlug=${resource}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data);
      }
    } catch {
      // silently fail, will retry
    }
  }, [resource]);

  const fetchMyOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/market/my-orders');
      if (res.ok) {
        const data = await res.json();
        setMyOrders(data.orders || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBook(), fetchMyOrders()]).finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetchBook();
      fetchMyOrders();
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchBook, fetchMyOrders]);

  // Update resource when selectedResource prop changes
  useEffect(() => {
    if (selectedResource) setResource(selectedResource);
  }, [selectedResource]);

  // Pre-fill price from best bid/ask
  useEffect(() => {
    if (book && !price) {
      if (side === 'buy' && book.bids.length > 0) {
        setPrice(String(book.bids[0].price));
      } else if (side === 'sell' && book.asks.length > 0) {
        setPrice(String(book.asks[0].price));
      } else if (book.currentPrice) {
        setPrice(String(Math.round(book.currentPrice)));
      }
    }
  }, [book, side]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (submitting) return;
    const priceInt = parseInt(price);
    const qtyInt = parseInt(quantity);

    if (!priceInt || priceInt < 1) {
      setError('Enter a valid price');
      return;
    }
    if (!qtyInt || qtyInt < 1) {
      setError('Enter a valid quantity');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/space-tycoon/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceSlug: resource,
          side,
          price: priceInt,
          quantity: qtyInt,
          expiresIn,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to place order');
      } else {
        setPrice('');
        setQuantity('');
        setError(null);
        setTab('orders');
        await Promise.all([fetchBook(), fetchMyOrders()]);
        onOrderPlaced?.();
      }
    } catch {
      setError('Network error placing order');
    }
    setSubmitting(false);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/space-tycoon/market/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        await Promise.all([fetchBook(), fetchMyOrders()]);
      }
    } catch {
      // silently fail
    }
  };

  // ─── Derived Values ───────────────────────────────────────────────────

  const resourceDef = RESOURCE_MAP.get(resource as never);
  const priceInt = parseInt(price) || 0;
  const qtyInt = parseInt(quantity) || 0;
  const totalCost = priceInt * qtyInt;
  const feeAmount = Math.round(totalCost * 0.02);
  const totalWithFee = side === 'buy' ? totalCost + feeAmount : totalCost - feeAmount;

  const maxBidQty = book?.bids.length ? Math.max(...book.bids.map(b => b.totalQty)) : 1;
  const maxAskQty = book?.asks.length ? Math.max(...book.asks.map(a => a.totalQty)) : 1;
  const maxQty = Math.max(maxBidQty, maxAskQty, 1);

  const myOrdersForResource = myOrders.filter(o => o.resourceSlug === resource && ['open', 'partial'].includes(o.status));

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Resource Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={resource}
          onChange={e => { setResource(e.target.value); setPrice(''); }}
          className="px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-500/30"
        >
          {RESOURCES.map(r => (
            <option key={r.id} value={r.id} className="bg-slate-900">{r.icon} {r.name}</option>
          ))}
        </select>

        {book && (
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-slate-400">
              Last: <span className="text-white font-mono">{formatMoney(book.lastTradePrice || book.currentPrice)}</span>
            </span>
            {book.change24h !== 0 && (
              <span className={book.change24h > 0 ? 'text-green-400' : 'text-red-400'}>
                {book.change24h > 0 ? '+' : ''}{book.change24h}%
              </span>
            )}
            {book.spread && (
              <span className="text-slate-500">
                Spread: {formatMoney(book.spread.absolute)} ({book.spread.percentage}%)
              </span>
            )}
            <span className="text-slate-500">Vol 24h: {book.volume24h}</span>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1">
        {(['book', 'place', 'orders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {t === 'book' ? 'Order Book' : t === 'place' ? 'Place Order' : `My Orders (${myOrdersForResource.length})`}
          </button>
        ))}
      </div>

      {/* Order Book Tab */}
      {tab === 'book' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          {loading ? (
            <div className="text-center text-slate-500 text-xs py-8">Loading order book...</div>
          ) : !book ? (
            <div className="text-center text-slate-500 text-xs py-8">No data available</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Bids (Buy Orders) */}
              <div>
                <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-2">
                  Bids (Buy)
                </div>
                <div className="space-y-0.5">
                  {book.bids.length === 0 ? (
                    <div className="text-slate-600 text-[10px] py-2">No buy orders</div>
                  ) : (
                    book.bids.map((bid, i) => (
                      <div key={i} className="relative flex items-center justify-between py-0.5 px-1.5 rounded text-[10px]">
                        {/* Depth bar */}
                        <div
                          className="absolute inset-y-0 left-0 bg-green-500/10 rounded"
                          style={{ width: `${(bid.totalQty / maxQty) * 100}%` }}
                          role="presentation"
                          aria-label={`${bid.totalQty} units at ${formatMoney(bid.price)}`}
                        />
                        <span className="relative z-10 text-green-400 font-mono">{formatMoney(bid.price)}</span>
                        <span className="relative z-10 text-slate-300 font-mono">
                          {bid.totalQty}
                          {bid.isNpc && <span className="text-slate-600 ml-1">NPC</span>}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Asks (Sell Orders) */}
              <div>
                <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-2">
                  Asks (Sell)
                </div>
                <div className="space-y-0.5">
                  {book.asks.length === 0 ? (
                    <div className="text-slate-600 text-[10px] py-2">No sell orders</div>
                  ) : (
                    book.asks.map((ask, i) => (
                      <div key={i} className="relative flex items-center justify-between py-0.5 px-1.5 rounded text-[10px]">
                        <div
                          className="absolute inset-y-0 right-0 bg-red-500/10 rounded"
                          style={{ width: `${(ask.totalQty / maxQty) * 100}%` }}
                          role="presentation"
                          aria-label={`${ask.totalQty} units at ${formatMoney(ask.price)}`}
                        />
                        <span className="relative z-10 text-red-400 font-mono">{formatMoney(ask.price)}</span>
                        <span className="relative z-10 text-slate-300 font-mono">
                          {ask.totalQty}
                          {ask.isNpc && <span className="text-slate-600 ml-1">NPC</span>}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Place Order Tab */}
      {tab === 'place' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          {/* Buy/Sell Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                side === 'buy'
                  ? 'bg-green-600/20 text-green-400 border-r border-white/[0.08]'
                  : 'text-slate-400 hover:text-white border-r border-white/[0.08]'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                side === 'sell'
                  ? 'bg-red-600/20 text-red-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Price Input */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Price per unit
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">$</span>
              <input
                type="number"
                min={1}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={book ? String(Math.round(book.currentPrice)) : '0'}
                className="flex-1 h-8 rounded-lg bg-white/[0.06] text-white text-xs font-mono px-2 border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
              />
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="1"
              className="w-full h-8 rounded-lg bg-white/[0.06] text-white text-xs font-mono px-2 border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
            />
            {side === 'sell' && resourceDef && (
              <p className="text-[10px] text-slate-500 mt-1">
                Available: {(state.resources[resource] || 0).toLocaleString()} {resourceDef.name}
              </p>
            )}
            {side === 'buy' && (
              <p className="text-[10px] text-slate-500 mt-1">
                Balance: {formatMoney(state.money)}
              </p>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Expires in
            </label>
            <select
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              className="w-full h-8 rounded-lg bg-white/[0.06] text-white text-xs px-2 border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
            >
              <option value="1h" className="bg-slate-900">1 hour</option>
              <option value="6h" className="bg-slate-900">6 hours</option>
              <option value="24h" className="bg-slate-900">24 hours</option>
              <option value="72h" className="bg-slate-900">3 days</option>
              <option value="1w" className="bg-slate-900">1 week</option>
            </select>
          </div>

          {/* Order Summary */}
          {priceInt > 0 && qtyInt > 0 && (
            <div className="bg-white/[0.03] rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white font-mono">{formatMoney(totalCost)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Fee (2%)</span>
                <span className="text-amber-400 font-mono">{formatMoney(feeAmount)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-white/[0.06] pt-1">
                <span className="text-slate-300 font-medium">
                  {side === 'buy' ? 'Total Cost' : 'You Receive'}
                </span>
                <span className={`font-mono font-bold ${side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {formatMoney(totalWithFee)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-[10px]">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handlePlaceOrder}
            disabled={submitting || !priceInt || !qtyInt}
            className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              side === 'buy'
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {submitting
              ? 'Placing...'
              : `${side === 'buy' ? 'Buy' : 'Sell'} ${qtyInt || 0} ${resourceDef?.name || resource} @ ${formatMoney(priceInt)}`}
          </button>
        </div>
      )}

      {/* My Orders Tab */}
      {tab === 'orders' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          {myOrders.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-6">
              No orders yet. Place your first limit order!
            </div>
          ) : (
            <div className="space-y-2">
              {myOrders.map(order => {
                const rDef = RESOURCE_MAP.get(order.resourceSlug as never);
                const fillPct = order.quantity > 0 ? Math.round((order.filledQty / order.quantity) * 100) : 0;
                const isActive = ['open', 'partial'].includes(order.status);
                const expiresAt = order.expiresAt ? new Date(order.expiresAt) : null;
                const timeLeft = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : 0;
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div
                    key={order.id}
                    className={`p-2.5 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-white/[0.08] bg-white/[0.02]'
                        : 'border-white/[0.04] bg-white/[0.01] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          order.side === 'buy'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {order.side}
                        </span>
                        <span className="text-white text-xs">
                          {rDef?.icon} {rDef?.name || order.resourceSlug}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          order.status === 'filled' ? 'bg-green-500/10 text-green-400' :
                          order.status === 'partial' ? 'bg-amber-500/10 text-amber-400' :
                          order.status === 'cancelled' ? 'bg-slate-500/10 text-slate-400' :
                          'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {order.status}
                        </span>
                        {isActive && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-[9px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded border border-red-500/20 hover:border-red-500/40 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        {order.filledQty}/{order.quantity} @ {formatMoney(order.price)}
                      </span>
                      {isActive && expiresAt && (
                        <span className="text-slate-500">
                          {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : `${minsLeft}m left`}
                        </span>
                      )}
                    </div>

                    {/* Fill progress bar */}
                    <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          order.side === 'buy' ? 'bg-green-500/40' : 'bg-red-500/40'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
