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
    change: number; // percent change from base
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

  // Load market prices (from API or use base prices as fallback)
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/space-tycoon/market');
        if (res.ok) {
          const data = await res.json();
          setPrices(data.prices || {});
          return;
        }
      } catch { /* fallback to base prices */ }

      // Fallback: use base prices with slight random variation
      const fallback: MarketPrices = {};
      for (const r of RESOURCES) {
        const variance = 1 + (Math.random() - 0.5) * 0.2;
        const current = Math.round(r.baseMarketPrice * variance);
        fallback[r.id] = {
          currentPrice: current,
          basePrice: r.baseMarketPrice,
          change: Math.round(((current / r.baseMarketPrice) - 1) * 100),
        };
      }
      setPrices(fallback);
    }
    fetchPrices();
  }, []);

  const getPrice = (resourceId: string) => {
    return prices[resourceId]?.currentPrice || RESOURCE_MAP.get(resourceId as never)?.baseMarketPrice || 0;
  };

  const handleSell = useCallback(() => {
    if (!selectedResource) return;
    const held = state.resources[selectedResource] || 0;
    const qty = Math.min(sellQty, held);
    if (qty <= 0) { playSound('error'); return; }

    const price = getPrice(selectedResource);
    const revenue = qty * price;
    playSound('money');
    onSellResource(selectedResource, qty, revenue);
    setSelectedResource(null);
    setSellQty(1);
  }, [selectedResource, sellQty, state.resources, onSellResource, prices]);

  // Resources the player owns
  const ownedResources = Object.entries(state.resources || {}).filter(([, qty]) => qty > 0);

  return (
    <div className="space-y-4">
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
                  <p className="text-slate-500 text-[10px]">Value: {formatMoney(value)}</p>
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
        if (!def) return null;
        return (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <h3 className="text-white text-sm font-semibold mb-2">
              Sell {def.icon} {def.name}
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSellQty(Math.max(1, sellQty - 1))}
                  className="w-7 h-7 rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors"
                >-</button>
                <input
                  type="number"
                  min={1}
                  max={held}
                  value={sellQty}
                  onChange={e => setSellQty(Math.max(1, Math.min(held, parseInt(e.target.value) || 1)))}
                  className="w-16 h-7 rounded bg-white/[0.06] text-white text-xs text-center border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
                />
                <button
                  onClick={() => setSellQty(Math.min(held, sellQty + 1))}
                  className="w-7 h-7 rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors"
                >+</button>
              </div>
              <button
                onClick={() => setSellQty(held)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300"
              >Sell All ({held})</button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs">Price: {formatMoney(price)}/unit</span>
              <span className="text-green-400 text-sm font-bold">+{formatMoney(sellQty * price)}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSell}
                className="flex-1 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
              >
                Sell {sellQty} for {formatMoney(sellQty * price)}
              </button>
              <button
                onClick={() => setSelectedResource(null)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-white/[0.04] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Market Prices */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
          📊 Market Prices
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
                      {change > 0 ? '+' : ''}{change}%
                    </span>
                  </div>
                  {onBuyResource && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { playSound('trade'); onBuyResource(r.id, 1, current); }}
                        disabled={state.money < current}
                        className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                          state.money >= current
                            ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                            : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                        }`}
                      >
                        Buy 1
                      </button>
                      <button
                        onClick={() => { playSound('trade'); onBuyResource(r.id, 20, current * 20); }}
                        disabled={state.money < current * 20}
                        className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                          state.money >= current * 20
                            ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                            : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                        }`}
                      >
                        Buy 20
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
