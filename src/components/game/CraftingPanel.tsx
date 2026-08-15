'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { PRODUCTION_CHAINS, CRAFTED_PRODUCT_IDS, getCraftedProductValue } from '@/lib/game/production-chains';
import { BUILDING_MAP, getCraftingSpeedMultiplier } from '@/lib/game/buildings';
import { RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney, formatDuration, formatCountdown } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { BUILDING_ASSETS } from '@/lib/game/assets';
import Image from 'next/image';

interface CraftingPanelProps {
  state: GameState;
  onStartCrafting: (recipeId: string) => void;
  /**
   * Wave E2 "Goods on the Book" (docs/ECONOMY_PVP_2026-08.md §E2): the sell
   * affordance. Crafted products are now first-class RESOURCE_MAP entries
   * held in `state.resources` (same pool the Market tab sells from), so this
   * reuses the SAME handler page.tsx already wires to MarketPanel — no new
   * state-update path, just a second surface that can call it.
   */
  onSellResource?: (resourceId: string, quantity: number, revenue: number) => void;
}

export default function CraftingPanel({ state, onStartCrafting, onSellResource }: CraftingPanelProps) {
  const [, setTick] = useState(0);
  const [sellingId, setSellingId] = useState<string | null>(null);
  // Re-render every second for countdown timers
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Crafted-goods inventory sitting in the shared resource pool (post Wave
  // E2 / save-load.ts V31, everything a player has crafted lives in
  // `state.resources` alongside mined resources).
  const craftedHeld = CRAFTED_PRODUCT_IDS
    .map(id => ({ id, qty: state.resources[id as never] || 0 }))
    .filter(r => r.qty > 0);

  // Sell affordance: same server trade route MarketPanel uses (live spot,
  // −3% broker fee), so a player doesn't have to tab-switch after a craft
  // completes. Falls back to the live-spot-priced client estimate if the
  // request fails (parity with MarketPanel's offline fallback).
  const handleSellCrafted = useCallback(async (resourceId: string, qty: number) => {
    if (!onSellResource || qty <= 0 || sellingId) return;
    setSellingId(resourceId);
    try {
      const res = await fetch('/api/space-tycoon/market/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sell', resourceSlug: resourceId, quantity: qty }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('money');
        onSellResource(resourceId, qty, data.trade.totalCost);
      } else {
        const price = getCraftedProductValue(
          { outputId: resourceId, marketValue: RESOURCE_MAP.get(resourceId as never)?.baseMarketPrice || 0 },
          state.marketSnapshot?.prices,
        );
        playSound('money');
        onSellResource(resourceId, qty, Math.round(qty * price * 0.97));
      }
    } catch {
      const price = getCraftedProductValue(
        { outputId: resourceId, marketValue: RESOURCE_MAP.get(resourceId as never)?.baseMarketPrice || 0 },
        state.marketSnapshot?.prices,
      );
      playSound('money');
      onSellResource(resourceId, qty, Math.round(qty * price * 0.97));
    }
    setSellingId(null);
  }, [onSellResource, sellingId, state.marketSnapshot]);

  const allResources = { ...(state.resources || {}), ...(state.craftedProducts || {}) };
  const completedBuildingIds = state.buildings.filter(b => b.isComplete).map(b => b.definitionId);

  // Crafting speed bonus from fabrication buildings
  const craftingSpeedMult = getCraftingSpeedMultiplier(state.buildings);
  const fabCount = state.buildings.filter(b =>
    b.isComplete && BUILDING_MAP.get(b.definitionId)?.category === 'fabrication_facility'
  ).length;

  const tiers = [
    { tier: 1, label: 'Raw Processing', icon: '🔩', color: 'slate' },
    { tier: 2, label: 'Components', icon: '⚙️', color: 'cyan' },
    { tier: 3, label: 'Products', icon: '🏗️', color: 'purple' },
    { tier: 4, label: 'Advanced', icon: '✨', color: 'amber' },
  ];

  // Active crafting — apply fabrication speed multiplier to duration
  const activeCraft = state.activeRefining;
  const activeRecipe = activeCraft ? PRODUCTION_CHAINS.find(c => c.id === activeCraft.recipeId) : null;
  const effectiveDuration = activeCraft ? activeCraft.durationSeconds / craftingSpeedMult : 0;
  const craftRemaining = activeCraft ? Math.max(0, effectiveDuration - (Date.now() - activeCraft.startedAtMs) / 1000) : 0;
  const craftPct = activeCraft ? Math.min(100, ((Date.now() - activeCraft.startedAtMs) / 1000 / effectiveDuration) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Fabrication hero banner */}
      <div className="hud-frame hud-frame-purple relative rounded-xl border border-purple-500/20 overflow-hidden">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="relative h-14 sm:h-16 overflow-hidden holo-sprite">
          <Image src={BUILDING_ASSETS.fabrication} alt="" fill className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a]/90 via-[#0a0a1a]/60 to-[#0a0a1a]/90" />
          <div className="absolute inset-0 flex items-center px-3">
            <span className="font-hud text-[10px] text-purple-300 uppercase tracking-wider font-medium">Orbital Fabrication — Production Chains</span>
          </div>
        </div>
      </div>

      {/* Fabrication Speed Bonus */}
      {fabCount >= 1 && (
        <div className="hud-frame relative flex items-center justify-between rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="game-number text-cyan-400 text-xs font-medium">Fabrication Speed: {craftingSpeedMult.toFixed(2)}x</span>
            <span className="text-slate-500 text-[10px]">({fabCount} fab{fabCount !== 1 ? 's' : ''})</span>
          </div>
          {fabCount === 1 && (
            <span className="text-slate-600 text-[10px]">Build more fabrication facilities to craft faster</span>
          )}
          {fabCount > 1 && (
            <span className="text-cyan-500/60 text-[10px]">+{Math.round((craftingSpeedMult - 1) * 100)}% faster crafting</span>
          )}
        </div>
      )}

      {/* Wave E2 "Goods on the Book" — sell affordance for finished crafted
          goods, right where you made them. Same live-spot / −3% broker sell
          the Market tab offers (state.resources is the one shared pool). */}
      {craftedHeld.length > 0 && (
        <div className="hud-frame hud-frame-amber relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <h3 className="font-hud text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📦</span> Finished Goods — Sell to Market
          </h3>
          <div className="space-y-1.5">
            {craftedHeld.map(({ id, qty }) => {
              const recipe = PRODUCTION_CHAINS.find(c => c.outputId === id);
              const def = RESOURCE_MAP.get(id as never);
              const unitPrice = getCraftedProductValue(
                { outputId: id, marketValue: recipe?.marketValue ?? def?.baseMarketPrice ?? 0 },
                state.marketSnapshot?.prices,
              );
              const revenue = Math.round(qty * unitPrice * 0.97); // −3% broker, matches server
              const busy = sellingId === id;
              return (
                <div key={id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" aria-hidden="true">{recipe?.icon || def?.icon || '📦'}</span>
                    <div>
                      <span className="text-white text-xs">{def?.name || id.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">×{qty}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="game-number text-slate-400 text-[10px]">{formatMoney(unitPrice)}/u</span>
                    <button
                      onClick={() => { if (!busy) { playSound('build_start'); handleSellCrafted(id, qty); } }}
                      disabled={busy || !onSellResource}
                      className="min-h-[44px] px-2 py-1 rounded text-[10px] font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors"
                    >
                      {busy ? 'Selling…' : `Sell All for ${formatMoney(revenue)}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Crafting */}
      {activeCraft && activeRecipe && (
        <div className="hud-frame hud-frame-purple relative rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeRecipe.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{activeRecipe.name}</p>
                <p className="text-slate-500 text-[10px]">Producing {activeRecipe.outputQuantity}x {activeRecipe.outputId.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <span className="game-number text-purple-400 text-xs">{formatCountdown(craftRemaining)}</span>
          </div>
          <div className="h-2 bg-purple-500/10 rounded-full overflow-hidden game-progress-shimmer">
            <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full transition-all" style={{ width: `${craftPct}%` }} />
          </div>
        </div>
      )}

      {/* Recipe Tiers */}
      {tiers.map(({ tier, label, icon }) => {
        const recipes = PRODUCTION_CHAINS.filter(c => c.tier === tier);
        const availableRecipes = recipes.filter(c =>
          c.requiredResearch.every(r => state.completedResearch.includes(r)) &&
          completedBuildingIds.includes(c.requiredBuilding)
        );

        if (availableRecipes.length === 0 && tier > 2) return null;

        return (
          <div key={tier}>
            <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>{icon}</span> Tier {tier}: {label}
            </h3>
            {availableRecipes.length === 0 ? (
              <p className="text-slate-600 text-xs mb-4">Requires fabrication buildings and research to unlock.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-2 mb-4">
                {availableRecipes.map(recipe => {
                  const hasInputs = Object.entries(recipe.inputs).every(
                    ([resId, qty]) => (allResources[resId] || 0) >= qty
                  );
                  const canCraft = hasInputs && !activeCraft;

                  return (
                    <div key={recipe.id} className="hud-frame game-card relative p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="hud-corner-bl" aria-hidden="true" />
                      <span className="hud-corner-br" aria-hidden="true" />
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{recipe.icon}</span>
                        <h4 className="text-white text-xs font-medium">{recipe.name}</h4>
                      </div>

                      {/* Inputs → Output */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {Object.entries(recipe.inputs).map(([resId, qty]) => {
                          const have = allResources[resId] || 0;
                          const short = have < qty;
                          return (
                            <span key={resId} className={`text-[10px] px-1 py-0.5 rounded border ${
                              short ? 'text-red-400 border-red-500/20' : 'text-slate-400 border-white/[0.06]'
                            }`}>{short ? '⚠ ' : ''}{resId.replace(/_/g, ' ')} {have}/{qty}</span>
                          );
                        })}
                        <span className="text-slate-600 text-[10px]">→</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                          {recipe.outputQuantity}x {recipe.outputId.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-500">
                          {craftingSpeedMult > 1 ? (
                            <><span className="line-through opacity-50">{formatDuration(recipe.timeSeconds)}</span>{' '}<span className="text-cyan-400">{formatDuration(Math.round(recipe.timeSeconds / craftingSpeedMult))}</span></>
                          ) : formatDuration(recipe.timeSeconds)} · Sells for {formatMoney(getCraftedProductValue(recipe, state.marketSnapshot?.prices))}/u
                        </div>
                        <button
                          onClick={() => { if (canCraft) { playSound('build_start'); onStartCrafting(recipe.id); } }}
                          disabled={!canCraft}
                          className={`min-h-[44px] px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            canCraft
                              ? 'bg-purple-600 text-white hover:bg-purple-500'
                              : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {activeCraft ? 'Busy' : 'Craft'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
