'use client';

import { canPrestige, calculatePrestigeRewards, getPrestigeName } from '@/lib/game/prestige';
import type { GameState } from '@/lib/game/types';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface PrestigeModalProps {
  state: GameState;
  onPrestige: () => void;
  onClose: () => void;
}

export default function PrestigeModal({ state, onPrestige, onClose }: PrestigeModalProps) {
  const currentLevel = state.prestige?.level || 0;
  const isEligible = canPrestige(state.unlockedLocations.length, state.completedResearch.length);
  const nextRewards = calculatePrestigeRewards(state.prestige || { level: 0, legacyPoints: 0, permanentBonuses: { revenueMultiplier: 1, buildSpeedMultiplier: 1, researchSpeedMultiplier: 1, miningMultiplier: 1, startingMoney: 500_000_000 } });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a0a30 0%, #0a0a1a 100%)' }}>
        <div className="h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-500" />

        <div className="p-6">
          <div className="text-center mb-5">
            <span className="text-5xl block mb-3">{currentLevel >= 3 ? '👑' : '⭐'}</span>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-purple-300">
              Prestige {currentLevel > 0 ? `(Level ${currentLevel})` : ''}
            </h3>
            {currentLevel > 0 && (
              <p className="text-purple-400 text-sm mt-1">{getPrestigeName(currentLevel)}</p>
            )}
          </div>

          {isEligible ? (
            <>
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4 mb-4">
                <p className="text-white text-sm font-medium mb-3">Prestige to Level {currentLevel + 1}</p>
                <p className="text-slate-400 text-xs mb-3">
                  Reset your buildings, research, and money — but keep <strong className="text-white">permanent bonuses</strong> that make your next run faster.
                </p>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Revenue Multiplier</span>
                    <span className="text-green-400">+{Math.round((nextRewards.permanentBonuses.revenueMultiplier - 1) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Build Speed</span>
                    <span className="text-cyan-400">+{Math.round((nextRewards.permanentBonuses.buildSpeedMultiplier - 1) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Research Speed</span>
                    <span className="text-purple-400">+{Math.round((nextRewards.permanentBonuses.researchSpeedMultiplier - 1) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Mining Output</span>
                    <span className="text-amber-400">+{Math.round((nextRewards.permanentBonuses.miningMultiplier - 1) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Starting Money</span>
                    <span className="text-white">{formatMoney(nextRewards.permanentBonuses.startingMoney)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Legacy Points</span>
                    <span className="text-amber-400">+{10 + (currentLevel + 1) * 5}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 mb-4">
                <p className="text-red-400 text-xs font-medium mb-1">What you lose:</p>
                <p className="text-slate-500 text-[10px]">All buildings, research, services, locations (except Earth + LEO), money, and resources. Ships and workforce reset. Contracts reset.</p>
              </div>

              <button
                onClick={() => { playSound('milestone'); onPrestige(); }}
                className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 rounded-xl transition-all"
              >
                Prestige to Level {currentLevel + 1}
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-3">You&apos;re not eligible for prestige yet.</p>
              <p className="text-slate-500 text-xs mb-4">
                Unlock all 11 solar system locations or complete 30+ research projects to prestige.
              </p>
              <div className="flex justify-center gap-4 text-xs">
                <span className={state.unlockedLocations.length >= 11 ? 'text-green-400' : 'text-slate-500'}>
                  Locations: {state.unlockedLocations.length}/11
                </span>
                <span className={state.completedResearch.length >= 30 ? 'text-green-400' : 'text-slate-500'}>
                  Research: {state.completedResearch.length}/30
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-xs text-slate-500 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
