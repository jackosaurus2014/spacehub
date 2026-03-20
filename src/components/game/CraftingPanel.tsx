'use client';

import { useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import { PRODUCTION_CHAINS } from '@/lib/game/production-chains';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { formatMoney, formatDuration, formatCountdown } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface CraftingPanelProps {
  state: GameState;
  onStartCrafting: (recipeId: string) => void;
}

export default function CraftingPanel({ state, onStartCrafting }: CraftingPanelProps) {
  const [, setTick] = useState(0);
  // Re-render every second for countdown timers
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const allResources = { ...(state.resources || {}), ...(state.craftedProducts || {}) };
  const completedBuildingIds = state.buildings.filter(b => b.isComplete).map(b => b.definitionId);

  const tiers = [
    { tier: 1, label: 'Raw Processing', icon: '🔩', color: 'slate' },
    { tier: 2, label: 'Components', icon: '⚙️', color: 'cyan' },
    { tier: 3, label: 'Products', icon: '🏗️', color: 'purple' },
    { tier: 4, label: 'Advanced', icon: '✨', color: 'amber' },
  ];

  // Active crafting
  const activeCraft = state.activeRefining;
  const activeRecipe = activeCraft ? PRODUCTION_CHAINS.find(c => c.id === activeCraft.recipeId) : null;
  const craftRemaining = activeCraft ? Math.max(0, activeCraft.durationSeconds - (Date.now() - activeCraft.startedAtMs) / 1000) : 0;
  const craftPct = activeCraft ? Math.min(100, ((Date.now() - activeCraft.startedAtMs) / 1000 / activeCraft.durationSeconds) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Active Crafting */}
      {activeCraft && activeRecipe && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeRecipe.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{activeRecipe.name}</p>
                <p className="text-slate-500 text-[10px]">Producing {activeRecipe.outputQuantity}x {activeRecipe.outputId.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <span className="text-purple-400 font-mono text-xs">{formatCountdown(craftRemaining)}</span>
          </div>
          <div className="h-2 bg-purple-500/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full transition-all bar-shimmer" style={{ width: `${craftPct}%` }} />
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
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                    <div key={recipe.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{recipe.icon}</span>
                        <h4 className="text-white text-xs font-medium">{recipe.name}</h4>
                      </div>

                      {/* Inputs → Output */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {Object.entries(recipe.inputs).map(([resId, qty]) => {
                          const have = allResources[resId] || 0;
                          return (
                            <span key={resId} className={`text-[8px] px-1 py-0.5 rounded border ${
                              have >= qty ? 'text-slate-400 border-white/[0.06]' : 'text-red-400 border-red-500/20'
                            }`}>{resId.replace(/_/g, ' ')} {have}/{qty}</span>
                          );
                        })}
                        <span className="text-slate-600 text-[10px]">→</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                          {recipe.outputQuantity}x {recipe.outputId.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-500">
                          {formatDuration(recipe.timeSeconds)} · Sells for {formatMoney(recipe.marketValue)}/u
                        </div>
                        <button
                          onClick={() => { if (canCraft) { playSound('build_start'); onStartCrafting(recipe.id); } }}
                          disabled={!canCraft}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
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
