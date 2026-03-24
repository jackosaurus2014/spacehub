'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import Image from 'next/image';

interface MarketPrices {
  [resourceId: string]: {
    currentPrice: number;
    basePrice: number;
    change: number;
  };
}

interface MarketPanelProps {
  state: GameState;
  onSellResource: (resourceId: string, quantity: number, revenue: number) => void;
  onBuyResource?: (resourceId: string, quantity: number, cost: number) => void;
}

export default function MarketPanel({ state, onSellResource, onBuyResource }: MarketPanelProps) {
  const [prices, setPrices] = useState<MarketPrices>({});
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [trading, setTrading] = useState(false);

  // Fetch live market prices from server
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/market');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.prices || {});
        return;
      }
    } catch { /* fallback */ }

    // Fallback: base prices
    const fallback: MarketPrices = {};
    for (const r of RESOURCES) {
      fallback[r.id] = { currentPrice: r.baseMarketPrice, basePrice: r.baseMarketPrice, change: 0 };
    }
    setPrices(fallback);
  }, []);

  // Fetch on mount and auto-refresh every 30 seconds
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getPrice = (resourceId: string) => {
    return prices[resourceId]?.currentPrice || RESOURCE_MAP.get(resourceId as never)?.baseMarketPrice || 0;
  };

  // Execute sell via server API
  const handleSell = useCallback(async () => {
    if (!selectedResource || trading) return;
    const held = state.resources[selectedResource] || 0;
    const qty = Math.min(sellQty, held);
    if (qty <= 0) { playSound('error'); return; }

    setTrading(true);
    try {
      const res = await fetch('/api/space-tycoon/market/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sell', resourceSlug: selectedResource, quantity: qty }),
      });
      const data = await res.json();
      if (data.success) {
        const revenue = data.trade.totalCost;
        playSound('money');
        onSellResource(selectedResource, qty, revenue);
        // Refresh prices to show new dynamic price
        await fetchPrices();
      } else {
        // Fallback to client-side price
        const price = getPrice(selectedResource);
        playSound('money');
        onSellResource(selectedResource, qty, qty * price);
      }
    } catch {
      // Offline fallback
      const price = getPrice(selectedResource);
      playSound('money');
      onSellResource(selectedResource, qty, qty * price);
    }
    setTrading(false);
    setSelectedResource(null);
    setSellQty(1);
  }, [selectedResource, sellQty, state.resources, onSellResource, trading, fetchPrices]);

  // Execute buy via server API
  const handleBuy = useCallback(async (resourceId: string, quantity: number) => {
    if (!onBuyResource || trading) return;
    const price = getPrice(resourceId);
    const cost = price * quantity;
    if (state.money < cost) { playSound('error'); return; }

    setTrading(true);
    try {
      const res = await fetch('/api/space-tycoon/market/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'buy', resourceSlug: resourceId, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('trade');
        onBuyResource(resourceId, quantity, data.trade.totalCost);
        await fetchPrices();
      } else {
        playSound('trade');
        onBuyResource(resourceId, quantity, cost);
      }
    } catch {
      playSound('trade');
      onBuyResource(resourceId, quantity, cost);
    }
    setTrading(false);
  }, [onBuyResource, trading, state.money, fetchPrices]);

  const ownedResources = Object.entries(state.resources || {}).filter(([, qty]) => qty > 0);

  return (
    <div className="space-y-4">
      {/* Live Market Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Live Global Market</span>
        </div>
        <span className="text-[10px] text-slate-500">Prices update in real time</span>
      </div>

      {/* Your Inventory */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📦</span> Your Resources
        </h3>
        {ownedResources.length === 0 ? (
          <p className="text-slate-500 text-xs">No resources yet. Build mining operations to produce resources.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ownedResources.map(([id, qty]) => {
              const def = RESOURCE_MAP.get(id as never);
              if (!def) return null;
              const price = getPrice(id);
              const value = qty * price;
              const change = prices[id]?.change || 0;
              return (
                <button
                  key={id}
                  onClick={() => { setSelectedResource(id); setSellQty(Math.min(10, qty)); }}
                  className={`p-2 rounded-lg text-left transition-all ${
                    selectedResource === id
                      ? 'bg-amber-500/20 border border-amber-500/30'
                      : 'bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {RESOURCE_ASSETS[id] ? (
                      <Image src={RESOURCE_ASSETS[id]} alt="" width={28} height={28} className="w-7 h-7 rounded object-cover flex-shrink-0" />
                    ) : (
                      <span className="text-sm">{def.icon}</span>
                    )}
                    <span className="text-white text-xs font-medium truncate">{def.name}</span>
                  </div>
                  <p className="text-amber-400 text-xs font-mono">{qty.toLocaleString()} units</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-slate-500 text-[10px]">{formatMoney(value)}</p>
                    {change !== 0 && (
                      <span className={`text-[9px] font-mono ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change > 0 ? '▲' : '▼'}{Math.abs(change)}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {selectedResource && (() => {
        const def = RESOURCE_MAP.get(selectedResource as never);
        const held = state.resources[selectedResource] || 0;
        const price = getPrice(selectedResource);
        const change = prices[selectedResource]?.change || 0;
        if (!def) return null;
        return (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
              {RESOURCE_ASSETS[selectedResource] ? (
                <Image src={RESOURCE_ASSETS[selectedResource]} alt="" width={24} height={24} className="w-6 h-6 rounded object-cover" />
              ) : (
                <span>{def.icon}</span>
              )}
              Sell {def.name}
              {change !== 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${change > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {change > 0 ? '▲' : '▼'}{Math.abs(change)}%
                </span>
              )}
            </h3>
            <p className="text-slate-500 text-[10px] mb-2">Selling will push the market price down</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <button onClick={() => setSellQty(Math.max(1, sellQty - 1))} className="w-7 h-7 rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors">-</button>
                <input type="number" min={1} max={held} value={sellQty} onChange={e => setSellQty(Math.max(1, Math.min(held, parseInt(e.target.value) || 1)))} className="w-16 h-7 rounded bg-white/[0.06] text-white text-xs text-center border border-white/[0.06] focus:outline-none focus:border-cyan-500/30" />
                <button onClick={() => setSellQty(Math.min(held, sellQty + 1))} className="w-7 h-7 rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors">+</button>
              </div>
              <button onClick={() => setSellQty(held)} className="text-[10px] text-cyan-400 hover:text-cyan-300">Sell All ({held})</button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs">Price: {formatMoney(price)}/unit</span>
              <span className="text-green-400 text-sm font-bold">+{formatMoney(sellQty * price)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSell} disabled={trading} className="flex-1 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg transition-colors">
                {trading ? 'Selling...' : `Sell ${sellQty} for ${formatMoney(sellQty * price)}`}
              </button>
              <button onClick={() => setSelectedResource(null)} className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-white/[0.04] rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        );
      })()}

      {/* Market Prices */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
          📊 Global Market Prices
        </h3>
        <div className="space-y-1.5">
          {RESOURCES.map(r => {
            const priceData = prices[r.id];
            const current = priceData?.currentPrice || r.baseMarketPrice;
            const change = priceData?.change || 0;
            return (
              <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  {RESOURCE_ASSETS[r.id] ? (
                    <Image src={RESOURCE_ASSETS[r.id]} alt="" width={24} height={24} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                  ) : (
                    <span className="text-sm">{r.icon}</span>
                  )}
                  <div>
                    <span className="text-white text-xs">{r.name}</span>
                    <span className="text-slate-600 text-[10px] ml-1.5">{r.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-white text-xs font-mono">{formatMoney(current)}</span>
                    <span className={`text-[10px] font-mono ml-1.5 ${
                      change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-500'
                    }`}>
                      {change > 0 ? '▲+' : change < 0 ? '▼' : ''}{change}%
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {/* Sell buttons (if player has this resource) */}
                    {(state.resources[r.id] || 0) > 0 && (
                      <>
                        <button
                          onClick={() => { setSelectedResource(r.id); setSellQty(Math.min(1, state.resources[r.id] || 0)); }}
                          disabled={trading}
                          className="px-2 py-0.5 text-[9px] font-medium rounded transition-colors bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30"
                        >Sell</button>
                      </>
                    )}
                    {/* Buy buttons */}
                    {onBuyResource && (
                      <>
                        <button
                          onClick={() => handleBuy(r.id, 1)}
                          disabled={state.money < current || trading}
                          className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                            state.money >= current && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 1</button>
                        <button
                          onClick={() => handleBuy(r.id, 10)}
                          disabled={state.money < current * 10 || trading}
                          className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                            state.money >= current * 10 && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 10</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-slate-600 text-[9px] mt-3 text-center">
          Prices change based on global player activity. Buying pushes prices up, selling pushes them down.
        </p>
      </div>
    </div>
  );
}
