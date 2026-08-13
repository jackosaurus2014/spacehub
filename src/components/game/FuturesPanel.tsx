'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import { RESOURCE_MAP, RESOURCES, type ResourceId } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import {
  computeBidAsk,
  computeMargin,
  openFutures,
  expireDueFutures,
  getOpenFuturesExposure,
  FUTURES_MARGIN_RATE,
  type FuturesDirection,
} from '@/lib/game/market-depth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketPriceEntry {
  currentPrice: number;
  basePrice: number;
  supply: number;
}

type FuturesTab = 'trade' | 'positions' | 'history';

interface Props {
  state: GameState;
  setState: (fn: (prev: GameState | null) => GameState | null) => void;
}

// Longer-dated than spot limit orders — futures exist to hedge mining/supply
// contracts over weeks, not hours (per market-depth.ts doc comment).
const EXPIRY_OPTIONS: { label: string; ms: number }[] = [
  { label: '6 Hours', ms: 6 * 60 * 60 * 1000 },
  { label: '24 Hours', ms: 24 * 60 * 60 * 1000 },
  { label: '3 Days', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '1 Week', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '2 Weeks', ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '1 Month', ms: 30 * 24 * 60 * 60 * 1000 },
];

function formatCountdownMs(ms: number): string {
  if (ms <= 0) return 'Settling…';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuturesPanel({ state, setState }: Props) {
  const [tab, setTab] = useState<FuturesTab>('trade');
  const [prices, setPrices] = useState<Record<string, MarketPriceEntry>>({});
  const [resource, setResource] = useState<ResourceId>('iron');
  const [direction, setDirection] = useState<FuturesDirection>('long');
  const [quantity, setQuantity] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(2); // default 3 days
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // ─── Live spot prices (reuses the existing /api/space-tycoon/market feed —
  //     no new API surface. supply/currentPrice/basePrice feed computeBidAsk
  //     exactly the way the server computes its own supplyMultiplier). ───────
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/market');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.prices || {});
      }
    } catch {
      // keep last known prices; quote falls back to base price below
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Live 1s tick to animate open-position settlement countdowns.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-settle contracts whose expiry has passed, using expireDueFutures —
  // the engine's own settlement function — against the latest known spot.
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev) return prev;
        const hasDue = (prev.futuresContracts || []).some(c => c.status === 'open' && c.expiresAtMs <= Date.now());
        if (!hasDue) return prev;
        return expireDueFutures(prev, (slug) => prices[slug]?.currentPrice ?? null, Date.now());
      });
    }, 15_000);
    return () => clearInterval(interval);
  }, [prices, setState]);

  const contracts = state.futuresContracts || [];
  const openContracts = useMemo(
    () => contracts.filter(c => c.status === 'open').sort((a, b) => a.expiresAtMs - b.expiresAtMs),
    [contracts],
  );
  const settledContracts = useMemo(
    () => contracts.filter(c => c.status === 'settled').sort((a, b) => (b.settledAtMs || 0) - (a.settledAtMs || 0)),
    [contracts],
  );
  const exposure = useMemo(() => getOpenFuturesExposure(state), [state]);

  const resourceDef = RESOURCE_MAP.get(resource);
  const priceEntry = prices[resource];
  const quote = useMemo(() => {
    if (!resourceDef) return null;
    const currentPrice = priceEntry?.currentPrice ?? resourceDef.baseMarketPrice;
    const basePrice = priceEntry?.basePrice ?? resourceDef.baseMarketPrice;
    const totalSupply = priceEntry?.supply ?? resourceDef.startingSupply;
    return computeBidAsk({
      currentPrice,
      basePrice,
      totalSupply,
      baselineSupply: resourceDef.startingSupply,
      volatility: resourceDef.volatility,
    });
  }, [resourceDef, priceEntry]);

  // Prefill strike at current spot when switching resource / first load.
  useEffect(() => {
    if (quote) setStrikePrice(String(Math.round(quote.spotPrice)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const qtyNum = parseInt(quantity) || 0;
  const strikeNum = parseInt(strikePrice) || 0;
  const notional = qtyNum * strikeNum;
  const marginRequired = qtyNum > 0 && strikeNum > 0 ? computeMargin(qtyNum, strikeNum) : 0;
  const canAfford = marginRequired > 0 && state.money >= marginRequired;
  const expiry = EXPIRY_OPTIONS[expiryIdx];

  const handleOpen = () => {
    if (submitting) return;
    setError(null);
    setSuccess(null);
    if (qtyNum < 1) { setError('Enter a valid quantity.'); return; }
    if (strikeNum < 1) { setError('Enter a valid strike price.'); return; }
    if (!canAfford) { setError(`Insufficient funds to post margin (need ${formatMoney(marginRequired)}).`); return; }

    setSubmitting(true);
    setState(prev => {
      if (!prev) return prev;
      return openFutures(prev, {
        resourceSlug: resource,
        quantity: qtyNum,
        strikePrice: strikeNum,
        direction,
        expiresAtMs: Date.now() + expiry.ms,
      });
    });
    setSuccess(`Opened ${direction === 'long' ? 'LONG' : 'SHORT'} position: ${qtyNum.toLocaleString()} ${resourceDef?.name || resource} @ ${formatMoney(strikeNum)}.`);
    setQuantity('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* ── Header / Exposure Summary ──────────────────────────────────────── */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
              <span className="text-cyan-400">📈</span> Futures Exchange
            </h2>
            <p className="text-slate-500 text-xs mt-1 max-w-lg">
              Lock in a resource price today, settled against the live spot price at expiry.
              Long profits if spot rises above your strike; short profits if it falls below.
              Every contract posts {(FUTURES_MARGIN_RATE * 100).toFixed(0)}% margin up front.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-1 text-right shrink-0">
            <div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Open positions</span>
              <span className="game-number text-white text-sm font-bold">{exposure.openCount}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Margin locked</span>
              <span className="game-number text-amber-300 text-sm font-bold">{formatMoney(exposure.totalMargin)}</span>
            </div>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>Long exposure: <span className="game-number text-green-400 font-medium">{formatMoney(exposure.longExposure)}</span></span>
          <span>Short exposure: <span className="game-number text-red-400 font-medium">{formatMoney(exposure.shortExposure)}</span></span>
        </div>
      </div>

      {/* ── Sub-Tab Navigation ─────────────────────────────────────────────── */}
      <div className="game-tab-bar flex flex-wrap gap-1.5 overflow-x-auto">
        {([
          { id: 'trade' as FuturesTab, label: 'Trade', icon: '💱' },
          { id: 'positions' as FuturesTab, label: `Positions (${openContracts.length})`, icon: '📌' },
          { id: 'history' as FuturesTab, label: `History (${settledContracts.length})`, icon: '🧾' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'game-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TRADE ─────────────────────────────────────────────────────────── */}
      {tab === 'trade' && (
        <div className="space-y-4">
          {/* Resource selector + live quote */}
          <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div className="sprite-frame w-8 h-8 flex-shrink-0 flex items-center justify-center">
                {RESOURCE_ASSETS[resource] ? (
                  <Image src={RESOURCE_ASSETS[resource]} alt="" width={32} height={32} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <span className="text-sm">{resourceDef?.icon}</span>
                )}
              </div>
              <select
                value={resource}
                onChange={e => setResource(e.target.value as ResourceId)}
                className="min-h-[44px] px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-500/30"
              >
                {RESOURCES.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-900">{r.icon} {r.name}</option>
                ))}
              </select>
            </div>

            {quote && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <div className="text-slate-500 text-[9px] uppercase tracking-wider">Spot</div>
                  <div className="game-number text-white font-bold">{formatMoney(quote.spotPrice)}</div>
                </div>
                <div className="bg-green-500/5 rounded-lg p-2 border border-green-500/10">
                  <div className="text-slate-500 text-[9px] uppercase tracking-wider">Bid</div>
                  <div className="game-number text-green-400 font-bold">{formatMoney(quote.bid)}</div>
                </div>
                <div className="bg-red-500/5 rounded-lg p-2 border border-red-500/10">
                  <div className="text-slate-500 text-[9px] uppercase tracking-wider">Ask</div>
                  <div className="game-number text-red-400 font-bold">{formatMoney(quote.ask)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2">
                  <div className="text-slate-500 text-[9px] uppercase tracking-wider">Spread</div>
                  <div className="game-number text-amber-300 font-bold">{(quote.spreadPct * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Long/Short + form */}
          <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />

            <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
              <button
                onClick={() => setDirection('long')}
                className={`flex-1 min-h-[44px] py-2 text-xs font-semibold transition-colors ${
                  direction === 'long'
                    ? 'bg-green-600/20 text-green-400 border-r border-white/[0.08]'
                    : 'text-slate-400 hover:text-white border-r border-white/[0.08]'
                }`}
              >
                ▲ Long — profit if price rises
              </button>
              <button
                onClick={() => setDirection('short')}
                className={`flex-1 min-h-[44px] py-2 text-xs font-semibold transition-colors ${
                  direction === 'short'
                    ? 'bg-red-600/20 text-red-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ▼ Short — profit if price falls
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full h-10 rounded-lg bg-white/[0.06] text-white text-xs font-mono px-2 border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Strike price / unit</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    min={1}
                    value={strikePrice}
                    onChange={e => setStrikePrice(e.target.value)}
                    placeholder={quote ? String(Math.round(quote.spotPrice)) : '0'}
                    className="flex-1 h-10 rounded-lg bg-white/[0.06] text-white text-xs font-mono px-2 border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Expires</label>
              <select
                value={expiryIdx}
                onChange={e => setExpiryIdx(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-lg bg-white/[0.06] text-white text-xs px-2 border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
              >
                {EXPIRY_OPTIONS.map((opt, i) => (
                  <option key={opt.label} value={i} className="bg-slate-900">{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Margin summary */}
            {qtyNum > 0 && strikeNum > 0 && (
              <div className="bg-white/[0.03] rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Notional value</span>
                  <span className="text-white font-mono">{formatMoney(notional)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Margin required ({(FUTURES_MARGIN_RATE * 100).toFixed(0)}%)</span>
                  <span className={`font-mono ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>{formatMoney(marginRequired)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/[0.06] pt-1">
                  <span className="text-slate-300 font-medium">Balance after open</span>
                  <span className="font-mono font-bold text-white">{formatMoney(state.money - marginRequired)}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-[10px]">{error}</div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-green-400 text-[10px]">{success}</div>
            )}

            <button
              onClick={handleOpen}
              disabled={submitting || !qtyNum || !strikeNum}
              className={`game-btn w-full min-h-[44px] py-2.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                direction === 'long'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {submitting
                ? 'Opening…'
                : `Open ${direction === 'long' ? 'Long' : 'Short'} — ${qtyNum || 0} ${resourceDef?.name || resource} @ ${formatMoney(strikeNum)}`}
            </button>
          </div>
        </div>
      )}

      {/* ── POSITIONS ─────────────────────────────────────────────────────── */}
      {tab === 'positions' && (
        <div className="hud-frame relative rounded-xl border border-white/[0.06] overflow-hidden">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          {openContracts.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-8">
              No open futures positions. Open one from the Trade tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="holo-table w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="text-left text-slate-500 font-medium py-2 px-3">Resource</th>
                    <th className="text-left text-slate-500 font-medium py-2 px-3">Side</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">Qty</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">Strike</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3 hidden sm:table-cell">Spot</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">Unrealized</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3 hidden sm:table-cell">Margin</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">Settles in</th>
                  </tr>
                </thead>
                <tbody>
                  {openContracts.map(c => {
                    const rDef = RESOURCE_MAP.get(c.resourceSlug as ResourceId);
                    const spot = prices[c.resourceSlug]?.currentPrice ?? rDef?.baseMarketPrice ?? c.strikePrice;
                    const sign = c.direction === 'long' ? 1 : -1;
                    const unrealized = Math.round(c.quantity * (spot - c.strikePrice) * sign);
                    const remaining = c.expiresAtMs - now;
                    const urgent = remaining < 60 * 60 * 1000; // under 1 hour
                    return (
                      <tr key={c.id} className="holo-row border-t border-white/[0.04]">
                        <td className="py-2 px-3">
                          <span className="text-white">{rDef?.icon} {rDef?.name || c.resourceSlug}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            c.direction === 'long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {c.direction === 'long' ? '▲ Long' : '▼ Short'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right game-number text-slate-300">{c.quantity.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right game-number text-slate-300">{formatMoney(c.strikePrice)}</td>
                        <td className="py-2 px-3 text-right game-number text-slate-400 hidden sm:table-cell">{formatMoney(spot)}</td>
                        <td className={`py-2 px-3 text-right game-number font-bold ${unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {unrealized >= 0 ? '+' : ''}{formatMoney(unrealized)}
                        </td>
                        <td className="py-2 px-3 text-right game-number text-amber-300 hidden sm:table-cell">{formatMoney(c.marginLocked)}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`timer-hud ${urgent ? 'timer-hud-live' : ''} ${urgent ? 'text-amber-300' : 'text-cyan-300'}`}>
                            {formatCountdownMs(remaining)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-600 text-center">
            Unrealized P&amp;L is an estimate at the latest known spot price — actual settlement uses the spot price at expiry.
          </div>
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="hud-frame relative rounded-xl border border-white/[0.06] overflow-hidden">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          {settledContracts.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-8">
              No settled contracts yet. Positions settle automatically at expiry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="holo-table w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="text-left text-slate-500 font-medium py-2 px-3">Resource</th>
                    <th className="text-left text-slate-500 font-medium py-2 px-3">Side</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">Qty</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">Strike</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3 hidden sm:table-cell">Settled</th>
                    <th className="text-right text-slate-500 font-medium py-2 px-3">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {settledContracts.map(c => {
                    const rDef = RESOURCE_MAP.get(c.resourceSlug as ResourceId);
                    const pnl = c.settlementPnL || 0;
                    return (
                      <tr key={c.id} className="holo-row border-t border-white/[0.04]">
                        <td className="py-2 px-3">
                          <span className="text-white">{rDef?.icon} {rDef?.name || c.resourceSlug}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            c.direction === 'long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {c.direction === 'long' ? '▲ Long' : '▼ Short'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right game-number text-slate-300">{c.quantity.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right game-number text-slate-300">{formatMoney(c.strikePrice)}</td>
                        <td className="py-2 px-3 text-right text-slate-500 hidden sm:table-cell">
                          {c.settledAtMs ? new Date(c.settledAtMs).toLocaleDateString() : '—'}
                        </td>
                        <td className={`py-2 px-3 text-right game-number font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
