'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import { isMarketEventExpired, type ActiveMarketEvent, type ForecastMarketEvent } from '@/lib/game/market-events';
// W14 (cargo logistics, audit C1): selling requires goods AT Earth/home —
// `state.resources` IS the Earth pool, so the held counts below are already
// honest; getResourceTotals surfaces what's sitting in remote stockpiles so
// the player understands why it isn't sellable yet.
import { getResourceTotals } from '@/lib/game/cargo-logistics';
import { MINED_ONLY_RESOURCE_IDS as MINED_ONLY_RESOURCE_ID_LIST } from '@/lib/game/economic-sinks';
// Balance Pass 2 (docs/BALANCE.md "Pass 2"): storage integrity must be
// visible where inventory is shown — decay may never feel like silent theft.
// These are the SAME pure functions the monthly tick charges, so the numbers
// shown are the numbers billed.
import {
  storageCapacityUnits,
  VOLATILE_BOILOFF_PER_MONTH,
  STORAGE_OVERFLOW_DECAY_PER_MONTH,
} from '@/lib/game/consumption';
import GameIcon from './GameIcon';
import { Concept } from './HoloTip';
// Wave A1 (docs/VISUAL_AAA_2026-08.md §A1.2) — shared numeric readout
// primitives so the price ledger reads as one instrument, not per-row markup.
import { ConsolePanel, Figure, FlowValue } from './chrome';
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

/** Resources that only come from mining/crafting — never stocked by NPC
 *  brokers on the open market. Buy flow is disabled for these; sell flow
 *  stays fully functional. Wave E2: now sourced from the single
 *  economic-sinks.ts list (also enforced server-side in market/trade/route.ts)
 *  instead of a locally-duplicated set, so the UI and server can't drift —
 *  it also picks up the 13 crafted products + life_support_pack for free. */
const MINED_ONLY_RESOURCE_IDS = new Set(MINED_ONLY_RESOURCE_ID_LIST);

export default function MarketPanel({ state, onSellResource, onBuyResource }: MarketPanelProps) {
  const [prices, setPrices] = useState<MarketPrices>({});
  const [activeMarketEvents, setActiveMarketEvents] = useState<ActiveMarketEvent[]>([]);
  const [forecastMarketEvents, setForecastMarketEvents] = useState<ForecastMarketEvent[]>([]);
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
        setForecastMarketEvents(data.forecastMarketEvents || []);
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

  // Balance Pass 2: per-resource storage readout. Capacity counts ALL pools
  // (Earth + remote stockpiles) because the monthly storage-integrity pass
  // taxes total holdings, not just what is sellable at Earth.
  const storageInfo = (resourceId: string) => {
    const cap = Math.round(storageCapacityUnits(state.buildings, resourceId));
    const total = getResourceTotals(state, resourceId).total;
    const boiloff = VOLATILE_BOILOFF_PER_MONTH[resourceId] || 0;
    return {
      cap,
      total,
      overCap: cap > 0 && total > cap,
      nearCap: cap > 0 && total <= cap && total >= cap * 0.85,
      fillPct: cap > 0 ? Math.min(100, Math.round((total / cap) * 100)) : 0,
      boiloffPct: Math.round(boiloff * 100),
    };
  };
  const overflowPct = Math.round(STORAGE_OVERFLOW_DECAY_PER_MONTH * 100);

  // Live (non-expired) market events, filtered for render.
  const liveMarketEvents = activeMarketEvents.filter(ev => !isMarketEventExpired(ev));

  // Active, unexpired market-discount intel perks (espionage rewards).
  const activeMarketDiscountPerks = (state.activeIntelPerks || []).filter(
    perk => perk.type === 'market_discount' && perk.expiresAtMs > Date.now()
  );

  const minutesRemaining = (expiresAtMs: number) => Math.max(0, Math.round((expiresAtMs - Date.now()) / 60000));

  // Wave M4 (docs/MEANINGFUL_2026-08.md §M4, F8): the same deterministic
  // schedule a code-reader could always compute ahead of time, now surfaced
  // to every player identically — "Market Outlook". Never gated by tier.
  const hoursUntil = (startsAtMs: number) => Math.max(0, (startsAtMs - Date.now()) / 3_600_000);
  const formatForecastWindow = (startsAtMs: number) => {
    const h = hoursUntil(startsAtMs);
    if (h < 1) return `in ${Math.max(1, Math.round(h * 60))}m`;
    if (h < 24) return `in ~${Math.round(h)}h`;
    const days = Math.floor(h / 24);
    const rem = Math.round(h % 24);
    return `in ~${days}d ${rem}h`;
  };

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

      {/* Market Outlook — Wave M4 public forecast (F8). Same data for every
          player, free tier included — [P2W] this must never be gated. */}
      {forecastMarketEvents.length > 0 && (
        <div
          className="hud-frame relative rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] px-3 py-2 space-y-1.5"
          role="status"
          aria-label="Market outlook — upcoming events"
        >
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm" aria-hidden="true">🔭</span>
            <span className="font-hud text-cyan-300 text-[11px] font-semibold uppercase tracking-wide">
              Market Outlook — Next 48h
            </span>
            <span className="text-slate-500 text-[9px] ml-auto">Public forecast · same for every trader</span>
          </div>
          <div className="space-y-1">
            {forecastMarketEvents.map(ev => {
              const affectedNames = ev.affectedResources
                .map(id => RESOURCE_MAP.get(id as never)?.name || id)
                .join(', ');
              const isSurge = ev.priceMultiplier >= 1;
              return (
                <div
                  key={`${ev.eventId}-${ev.startsAtMs}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
                >
                  <span aria-hidden="true">{ev.icon}</span>
                  <span className="text-slate-200">{ev.name}</span>
                  <span className={`game-number text-[10px] px-1 py-0.5 rounded font-semibold ${
                    isSurge ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {isSurge ? '▲' : '▼'} ×{ev.priceMultiplier.toFixed(1)}
                  </span>
                  <span className="text-slate-500">{affectedNames}</span>
                  <span className="ml-auto text-slate-400 font-mono">{formatForecastWindow(ev.startsAtMs)}</span>
                </div>
              );
            })}
          </div>
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-3">
          <h3 className="font-hud text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <GameIcon name="package" size={14} /> Your Resources
          </h3>
          {/* Balance Pass 2: storage-integrity legend — keyboard/SR-reachable
              glossary trigger, kept OUTSIDE the card buttons (no nested
              interactive controls). */}
          <span className="text-[10px] text-slate-500">
            <Concept id="storage-cap">Storage caps</Concept>
            {' '}&middot;{' '}
            <Concept id="boiloff">boiloff</Concept>
          </span>
        </div>
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
              // Balance Pass 2: storage state — total across all pools vs cap.
              const st = storageInfo(id);
              return (
                <button
                  key={id}
                  onClick={() => { setSelectedResource(id); setSellQty(Math.min(10, qty)); }}
                  className={`p-2 rounded-lg text-left transition-all ${
                    selectedResource === id
                      ? 'bg-amber-500/20 border border-amber-500/30'
                      : st.overCap
                        ? 'bg-white/[0.03] border border-amber-500/40 hover:border-amber-500/60'
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
                      <span className={`game-number text-[10px] ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change > 0 ? '▲' : '▼'}{Math.abs(change)}%
                      </span>
                    )}
                  </div>
                  {/* Balance Pass 2: storage capacity + decay state. Plain
                      text (screen-reader-visible), never color-alone; the
                      fill bar is decorative. */}
                  <div
                    className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full rounded-full ${st.overCap ? 'bg-amber-400' : st.nearCap ? 'bg-amber-400/60' : 'bg-cyan-500/50'}`}
                      style={{ width: `${st.fillPct}%` }}
                    />
                  </div>
                  <p className={`mt-0.5 text-[10px] leading-tight ${st.overCap ? 'text-amber-300' : 'text-slate-500'}`}>
                    {st.overCap ? (
                      <span className="inline-flex items-center gap-1">
                        <GameIcon name="warning" size={10} />
                        <span>
                          Over cap — {Math.round(st.total - st.cap).toLocaleString()} u decaying {overflowPct}%/mo
                        </span>
                      </span>
                    ) : (
                      <>Storage {Math.round(st.total).toLocaleString()} / {st.cap.toLocaleString()}{st.nearCap ? ' — near cap' : ''}</>
                    )}
                    {st.boiloffPct > 0 && (
                      <span className="block text-slate-500">Volatile — boils off {st.boiloffPct}%/mo</span>
                    )}
                  </p>
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
            {/* Balance Pass 2: over-cap decay warning — selling surplus is
                the loss-stopping move, say so where the sale happens. */}
            {(() => {
              const st = storageInfo(selectedResource);
              if (!st.overCap && st.boiloffPct === 0) return null;
              return (
                <p className="text-amber-300/90 text-[10px] mb-2 flex items-start gap-1" role="note">
                  <GameIcon name="warning" size={12} />
                  <span>
                    {st.overCap && (
                      <>
                        {Math.round(st.total - st.cap).toLocaleString()} unit{Math.round(st.total - st.cap) === 1 ? '' : 's'} above
                        your {st.cap.toLocaleString()}-unit <Concept id="storage-cap">storage capacity</Concept> — surplus decays {overflowPct}% per
                        game-month. Selling it stops the loss.{' '}
                      </>
                    )}
                    {st.boiloffPct > 0 && (
                      <>This volatile <Concept id="boiloff">boils off</Concept> {st.boiloffPct}% of total stock per game-month.</>
                    )}
                  </span>
                </p>
              );
            })()}
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
      {/* Wave A1: promoted from a hand-rolled hud-frame div with an emoji
          header to the shared ConsolePanel housing, so the price ledger picks
          up the same bevel/hardware materiality as every other console. */}
      <ConsolePanel
        title="Global Market Prices"
        icon="market"
        asH3
        subtitle="Bid, ask and live spot for every traded commodity."
      >
        <div className="space-y-1.5">
          {RESOURCES.map(r => {
            const priceData = prices[r.id];
            const current = priceData?.currentPrice || r.baseMarketPrice;
            // Ask = what you actually pay (scarcity-adjusted) — this is what the server charges.
            const ask = priceData?.effectivePrice || current;
            const change = priceData?.change || 0;
            // Wave E2 (§2.5 "one price truth"): the live spot (`current`) is
            // now the single price that values contracts, NPC settlement, and
            // mega-project contributions — so show how far it has drifted from
            // its static base reference. Colorblind-safe: explicit "vs base"
            // label + signed number, not color alone.
            const spotDevPct = r.baseMarketPrice > 0
              ? Math.round(((current - r.baseMarketPrice) / r.baseMarketPrice) * 100)
              : 0;
            const mineOnly = MINED_ONLY_RESOURCE_IDS.has(r.id);
            const scarcity = priceData?.supplyMultiplier;
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
                  {/* Wave A1: the three price lines are now a tabular column —
                      fixed min-width + tabular-nums means bids, asks and spots
                      line up decimal-for-decimal down the whole ledger instead
                      of ragging with each figure's width. */}
                  <div className="text-right min-w-[112px] sm:min-w-[132px]">
                    <div className="flex items-baseline justify-end gap-2 text-[10px]">
                      <span className="text-amber-300" title="Bid — what you receive per unit when selling (includes 3% broker fee)">
                        <span className="text-slate-500 mr-0.5">B</span>
                        <Figure value={formatMoney(Math.round(current * 0.97))} className="text-[10px] text-amber-300" />
                      </span>
                      <span className="text-cyan-300" title="Ask — what you pay per unit when buying (includes scarcity premium)">
                        <span className="text-slate-500 mr-0.5">A</span>
                        <Figure value={formatMoney(ask)} className="text-[10px] text-cyan-300" />
                      </span>
                    </div>
                    <div className="game-number text-white text-xs">
                      <Figure value={formatMoney(current)} className="text-xs" />
                      <FlowValue
                        className="ml-1.5"
                        text={`${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}`}
                        unit="%"
                        direction={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}
                        srDirection={change > 0 ? 'price up' : change < 0 ? 'price down' : 'price unchanged'}
                      />
                      {/* V8 density mode — compact reveals scarcity (supply
                          multiplier) inline; comfortable keeps the row to
                          price + change only. */}
                      {typeof scarcity === 'number' && (
                        <span
                          className="density-compact-reveal items-baseline text-[10px] ml-1 text-purple-300/80"
                          title={`Scarcity multiplier — ${scarcity.toFixed(2)}x spot price paid on buy`}
                        >
                          ×{scarcity.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] font-mono ${
                        spotDevPct > 0 ? 'text-green-400/80' : spotDevPct < 0 ? 'text-red-400/80' : 'text-slate-500'
                      }`}
                      title={`Live spot vs base reference (${formatMoney(r.baseMarketPrice)}). Spot is the one price that now pays contracts, NPC settlement, and mega-project contributions.`}
                    >
                      spot {spotDevPct > 0 ? '+' : ''}{spotDevPct}% vs base
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Sell buttons (if player has this resource) */}
                    {(state.resources[r.id] || 0) > 0 && (
                      <>
                        <button
                          onClick={() => { setSelectedResource(r.id); setSellQty(Math.min(1, state.resources[r.id] || 0)); }}
                          disabled={trading}
                          className="min-h-[44px] px-2 py-0.5 text-[10px] font-medium rounded transition-colors bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30"
                        >Sell</button>
                      </>
                    )}
                    {/* Buy buttons */}
                    {onBuyResource && mineOnly && (
                      <span
                        className="min-h-[44px] flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-white/[0.02] text-slate-500 border border-dashed border-white/[0.08]"
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
                          className={`min-h-[44px] px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                            state.money >= ask && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 1</button>
                        <button
                          onClick={() => handleBuy(r.id, 10)}
                          disabled={state.money < ask * 10 || trading}
                          title={`Pay ${formatMoney(ask * 10)}`}
                          className={`min-h-[44px] px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                            state.money >= ask * 10 && !trading
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30'
                              : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                          }`}
                        >Buy 10</button>
                        <button
                          onClick={() => handleBuy(r.id, 100)}
                          disabled={state.money < ask * 100 || trading}
                          title={`Pay ${formatMoney(ask * 100)}`}
                          className={`min-h-[44px] px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
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
        <p className="text-slate-600 text-[11px] mt-3 text-center">
          Prices change based on global player activity. Buying pushes prices up, selling pushes them down.
        </p>
      </ConsolePanel>
    </div>
  );
}
