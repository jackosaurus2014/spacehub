'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { ACHIEVEMENTS, getAchievementBadgeUrl } from '@/lib/game/achievements';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface AchievementsModalProps {
  state: GameState;
  unlockedIds: string[];
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🏆' },
  { id: 'wealth', label: 'Wealth', icon: '💰' },
  { id: 'building', label: 'Building', icon: '🏗️' },
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'exploration', label: 'Exploration', icon: '🗺️' },
  { id: 'market', label: 'Market', icon: '📊' },
  { id: 'milestone', label: 'Milestones', icon: '⭐' },
];

export default function AchievementsModal({ state, unlockedIds, onClose }: AchievementsModalProps) {
  const [filter, setFilter] = useState('all');
  useEscapeKey(onClose);

  const filtered = filter === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === filter);

  const unlocked = unlockedIds.length;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked / total) * 100);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="achievements-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm game-modal-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden flex flex-col game-modal-card" style={{ background: '#0a0a1a' }}>
        <div className="h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-purple-500" aria-hidden="true" />

        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h3 id="achievements-title" className="text-white font-bold text-lg flex items-center gap-2">🏆 Achievements</h3>
            <button
              onClick={onClose}
              aria-label="Close achievements"
              className="w-9 h-9 rounded-full text-slate-400 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors text-sm flex items-center justify-center"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Achievement completion"
              aria-valuenow={unlocked}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuetext={`${unlocked} of ${total} achievements unlocked, ${pct} percent`}
            >
              <div className="h-full bg-gradient-to-r from-amber-500 to-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} aria-hidden="true" />
            </div>
            <span className="text-cyan-400 text-xs font-mono" aria-hidden="true">{unlocked}/{total}</span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  filter === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-white/[0.04] text-slate-500 hover:text-white'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Achievement Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map(a => {
            const isUnlocked = unlockedIds.includes(a.id);
            const badgeUrl = getAchievementBadgeUrl(a);
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-amber-500/5 to-cyan-500/5 border border-amber-500/20'
                    : 'bg-white/[0.02] border border-white/[0.04] opacity-60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden ${
                  isUnlocked ? 'bg-amber-500/10' : 'bg-white/[0.04]'
                }`}>
                  {isUnlocked ? (
                    badgeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={badgeUrl} alt={a.name} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <span>{a.icon}</span>
                    )
                  ) : (
                    <span className="grayscale opacity-70">🔒</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                      {a.name}
                    </span>
                    {a.title && isUnlocked && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {a.title}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[10px]">{a.description}</p>
                </div>
                {isUnlocked && (
                  <span className="text-green-400 text-xs shrink-0">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
