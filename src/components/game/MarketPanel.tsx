'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import { isMarketEventExpired, type ActiveMarketEvent } from '@/lib/game/market-events';
// W14 (cargo logistics, audit C1): selling requires goods AT Earth/home —
// `state.resources` IS the Earth pool, so the held counts below are already
// honest; getResourceTotals surfaces what's sitting in remote stockpiles so
// the player understands why it isn't sellable yet.
import { getResourceTotals } from '@/lib/game/cargo-logistics';
import Image from 'next/image';

interface MarketPrices {
  [resourceId: string]: {
    currentPrice: number;
    basePrice: number;
    /** Scarcity-adjusted price — this is what the server actually charges on buy. */
    effectivePrice?: number;
    change: number;
    supply?: number;
    available?: number;
    supplyMultiplier?: number;
    eventMultiplier?: number;
  };
}

interface MarketPanelProps {
  state: GameState;
  onSellResource: (resourceId: string, quantity: number, revenue: number) => void;
  onBuyResource?: (resourceId: string, quantity: number, cost: number) => void;
}

/** Resources that only come from mining operations — never stocked by NPC
 *  brokers on the open market. Buy flow is disabled for these; sell flow
 *  (surplus from mining) stays fully functional. */
const MINED_ONLY_RESOURCE_IDS = new Set(['exotic_fuel', 'xenogenic_biomatter']);

export default function MarketPanel({ state, onSellResource, onBuyResource }: MarketPanelProps) {
  const [prices, setPrices] = useState<MarketPrices>({});
  const [activeMarketEvents, setActiveMarketEvents] = useState<ActiveMarketEvent[]>([]);
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
        setActiveMarketEvents(data.activeMarketEvents || []);
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

  // Buy price the server actually charges (scarcity mult baked in). Falls back
  // to currentPrice and then the static base price so older server responses
  // without effectivePrice still render sensibly.
  const getPrice = (resourceId: string) => {
    const p = prices[resourceId];
    return p?.effectivePrice || p?.currentPrice || RESOURCE_MAP.get(resourceId as never)?.baseMarketPrice || 0;
  };
  // Sell price (no scarcity premium — sellers receive the raw price minus broker fee server-side).
  const getSellPrice = (resourceId: string) => {
    const p = prices[resourceId];
    return p?.currentPrice || RESOURCE_MAP.get(resourceId as never)?.baseMarketPrice || 0;
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
        const price = getSellPrice(selectedResource);
        playSound('money');
        onSellResource(selectedResource, qty, qty * price);
      }
    } catch {
      // Offline fallback
      const price = getSellPrice(selectedResource);
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

  // Live (non-expired) market events, filtered for render.
  const liveMarketEvents = activeMarketEvents.filter(ev => !isMarketEventExpired(ev));

  // Active, unexpired market-discount intel perks (espionage rewards).
  const activeMarketDiscountPerks = (state.activeIntelPerks || []).filter(
    perk => perk.type === 'market_discount' && perk.expiresAtMs > Date.now()
  );

  const minutesRemaining = (expiresAtMs: number) => Math.max(0, Math.round((expiresAtMs - Date.now()) / 60000));

  return (
    <div className="space-y-4">
      {/* Active Market Events */}
      {liveMarketEvents.length > 0 && (
        <div className="space-y-2" role="status" aria-label="Active market events">
          {liveMarketEvents.map(ev => {
            const affectedNames = ev.affectedResources
              .map(id => RESOURCE_MAP.get(id as never)?.name || id)
              .join(', ');
            const isSurge = ev.priceMultiplier >= 1;
            return (
              <div
                key={ev.eventId}
                className={`hud-frame relative flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg border ${
                  isSurge ? 'border-green-500/25 bg-green-500/[0.06]' : 'border-red-500/25 bg-red-500/[0.06]'
                }`}
              >
                <span className="hud-corner-bl" aria-hidden="true" />
                <span className="hud-corner-br" aria-hidden="true" />
                <span className="text-sm" aria-hidden="true">{ev.icon}</span>
                <span className="font-hud text-white text-xs font-semibold">{ev.name}</span>
                <span className={`game-number text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isSurge ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {isSurge ? '▲' : '▼'} ×{ev.priceMultiplier.toFixed(1)}
                </span>
                <span className="text-slate-400 text-[10px]">Affects: {affectedNames}</span>
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-mono"
                  aria-label={`Expires in ${minutesRemaining(ev.expiresAtMs)} minutes`}
                >
                  ⏱ {minutesRemaining(ev.expiresAtMs)}m left
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Market Discount Intel Perks */}
      {activeMarketDiscountPerks.length > 0 && (
        <div className="space-y-2" role="status" aria-label="Active market discount perks">
          {activeMarketDiscountPerks.map((perk, i) => (
            <div
              key={i}
              className="hud-frame relative flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg border border-purple-500/25 bg-purple-500/[0.06]"
            >
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
              <span className="text-sm" aria-hidden="true">🕵️</span>
              <span className="font-hud text-white text-xs font-semibold">Trade Route Intel Active</span>
              <span className="game-number text-[10px] px-1.5 py-0.5 rounded font-semibold bg-purple-500/15 text-purple-300">
                −{Math.round(perk.discount * 100)}% broker fee
              </span>
              <span className="text-slate-400 text-[10px]">
                {perk.resources && perk.resources.length > 0
                  ? `Applies to: ${perk.resources.map(id => RESOURCE_MAP.get(id as never)?.name || id).join(', ')}`
                  : 'Applies to all resources'}
              </span>
              <span
                className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-mono"
                aria-label={`Expires in ${minutesRemaining(perk.expiresAtMs)} minutes`}
              >
                ⏱ {minutesRemaining(perk.expiresAtMs)}m left
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Live Market Banner */}
      <div className="hud-frame hud-frame-amber relative flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-medium">Live Global Market</span>
        </div>
        <span className="text-[10px] text-slate-500">Prices update in real time</span>
      </div>

      {/* Your Inventory */}
      <div className="hud-frame hud-frame-amber relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <h3 className="font-hud text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📦</span> Your Resources
        </h3>
        {ownedResources.length === 0 ? (
          <p className="text-slate-500 text-xs">No resources yet. Build mining operations to produce resources.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ownedResources.map(([id, qty]) => {
              const def = RESOURCE_MAP.get(id as never);
              if (!def) return null;
              const price = getSellPrice(id);
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
                    <div className="sprite-frame w-7 h-7 flex-shrink-0 flex items-center justify-center">
                      {RESOURCE_ASSETS[id] ? (
                        <Image src={RESOURCE_ASSETS[id]} alt="" width={28} height={28} className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <span className="text-sm">{def.icon}</span>
                      )}
                    </div>
                    <span className="text-white text-xs font-medium truncate">{def.name}</span>
                  </div>
                  <p className="game-number text-amber-400 text-xs">{qty.toLocaleString()} units</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-slate-500 text-[10px]">{formatMoney(value)}</p>
                    {change !== 0 && (
                      <span className={`game-number text-[9px] ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
        const price = getSellPrice(selectedResource);
        const change = prices[selectedResource]?.change || 0;
        // W14: goods sitting at remote stockpiles are NOT sellable until
        // freighted to Earth — say so instead of silently under-counting.
        const totals = getResourceTotals(state, selectedResource);
        if (!def) return null;
        return (
          <div className="hud-frame relative rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
              <div className="sprite-frame holo-sprite w-7 h-7 flex-shrink-0 flex items-center justify-center">
                {RESOURCE_ASSETS[selectedResource] ? (
                  <Image src={RESOURCE_ASSETS[selectedResource]} alt="" width={24} height={24} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <span>{def.icon}</span>
                )}
              </div>
              Sell {def.name}
              {change !== 0 && (
                <span className={`game-number text-[10px] px-1.5 py-0.5 rounded ${change > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {change > 0 ? '▲' : '▼'}{Math.abs(change)}%
                </span>
              )}
            </h3>
            <p className="text-slate-500 text-[10px] mb-2">Selling will push the market price down</p>
            {totals.remote > 0 && (
              <p className="text-amber-300/90 text-[10px] mb-2" role="note">
                📦 {totals.remote.toLocaleString()} more unit{totals.remote === 1 ? '' : 's'} in remote stockpiles
                {totals.remoteBreakdown[0] ? ` (most at ${totals.remoteBreakdown[0].locationId.replace(/_/g, ' ')})` : ''} —
                only goods at Earth can clear the market. Freight them home from the Map or Fleet tab.
              </p>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <button onClick={() => setSellQty(Math.max(1, sellQty - 1))} aria-label="Decrease sell quantity by 1" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors">-</button>
                <input type="number" min={1} max={held} value={sellQty} onChange={e => setSellQty(Math.max(1, Math.min(held, parseInt(e.target.value) || 1)))} className="w-16 h-7 rounded bg-white/[0.06] text-white text-xs text-center border border-white/[0.06] focus:outline-none focus:border-cyan-500/30" />
                <button onClick={() => setSellQty(Math.min(held, sellQty + 1))} aria-label="Increase sell quantity by 1" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors">+</button>
              </div>
              <button onClick={() => setSellQty(held)} className="min-h-[44px] px-1 text-[10px] text-cyan-400 hover:text-cyan-300">Sell All ({held})</button>
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
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-3">
          📊 Global Market Prices
        </h3>
        <div className="space-y-1.5">
          {RESOURCES.map(r => {
            const priceData = prices[r.id];
            const current = priceData?.currentPrice || r.baseMarketPrice;
            // Ask = what you actually pay (scarcity-adjusted) — this is what the server charges.
            const ask = priceData?.effectivePrice || current;
            const change = priceData?.change || 0;
            const mineOnly = MINED_ONLY_RESOURCE_IDS.has(r.id);
            return (
              <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="sprite-frame w-6 h-6 flex-shrink-0 flex items-center justify-center">
                    {RESOURCE_ASSETS[r.id] ? (
                      <Image src={RESOURCE_ASSETS[r.id]} alt="" width={24} height={24} className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <span className="text-sm">{r.icon}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-white text-xs">{r.name}</span>
                    <span className="text-slate-600 text-[10px] ml-1.5">{r.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-2 text-[9px] font-mono">
                      <span className="text-amber-300" title="Bid — what you receive per unit when selling (includes 3% broker fee)">
                        B: {formatMoney(Math.round(current * 0.97))}
                      </span>
                      <span className="text-cyan-300" title="Ask — what you pay per unit when buying (includes scarcity premium)">
                        A: {formatMoney(ask)}
                      </span>
                    </div>
                    <div className="game-number text-white text-xs">
                      {formatMoney(current)}
                      <span className={`text-[10px] ml-1.5 ${
                        change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {change > 0 ? '▲+' : change < 0 ? '▼' : ''}{change}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Sell buttons (if player has this resource) */}
                    {(state.resources[r.id] || 0) > 0 && (
                      <>
                        <button
                          onClick={() => { setSelectedResource(r.id); setSellQty(Math.min(1, state.resources[r.id] || 0)); }}
                          disabled={trading}
                          className="min-h-[44px] px-2 py-0.5 text-[9px] font-medium rounded transition-colors bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30"
                        >Sell</button>
                      </>
                    )}
                    {/* Buy buttons */}
                    {onBuyResource && mineOnly && (
                      <span
                        className="min-h-[44px] flex items-center px-2 py-0.5 text-[9px] font-medium rounded bg-white/[0.02] text-slate-500 border border-dashed border-white/[0.08]"
                        title="Mined only — not sold on the open market"
                      >
                        ⛏ Mined only — not for sale
                      </span>
                    )}
                    {onBuyResource && !mineOnly && (
                      <>
                        <button
                          onClick={() => handleBuy(r.id, 1)}
                          disabled={state.money < ask || trading}
                          title={`Pay ${formatMoney(ask)}`}
                          className={`min-h-[44px] px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                            state.money >= ask && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 1</button>
                        <button
                          onClick={() => handleBuy(r.id, 10)}
                          disabled={state.money < ask * 10 || trading}
                          title={`Pay ${formatMoney(ask * 10)}`}
                          className={`min-h-[44px] px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                            state.money >= ask * 10 && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 10</button>
                        <button
                          onClick={() => handleBuy(r.id, 100)}
                          disabled={state.money < ask * 100 || trading}
                          title={`Pay ${formatMoney(ask * 100)}`}
                          className={`min-h-[44px] px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                            state.money >= ask * 100 && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 100</button>
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
