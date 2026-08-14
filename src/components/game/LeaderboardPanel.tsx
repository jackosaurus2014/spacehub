'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import { getNPCTitle } from '@/lib/game/npc-companies';
import { formatMoney } from '@/lib/game/formulas';
import ShareButton from '@/components/ui/ShareButton';
import { APP_URL } from '@/lib/constants';

// Rank 1-3 reuse existing achievement badge art as holo rank medals — escalating
// wealth-tier badges read naturally as gold/silver/bronze without new art.
const RANK_MEDAL: Record<number, { badge: string; tone: 'gold' | 'silver' | 'bronze' }> = {
  1: { badge: 'transcendent', tone: 'gold' },
  2: { badge: 'benefactor', tone: 'silver' },
  3: { badge: 'industrialist', tone: 'bronze' },
};

interface LeaderboardEntry {
  rank: number;
  companyName: string;
  title: string | null;
  netWorth: number;
  totalEarned: number;
  buildingCount: number;
  researchCount: number;
  locationsUnlocked: number;
  isYou: boolean;
  isNPC: boolean;
}

type SortField = 'netWorth' | 'totalEarned' | 'buildingCount' | 'researchCount';

const SORT_OPTIONS: { field: SortField; label: string; icon: string }[] = [
  { field: 'netWorth', label: 'Net Worth', icon: '💰' },
  { field: 'totalEarned', label: 'Total Earned', icon: '📈' },
  { field: 'buildingCount', label: 'Buildings', icon: '🏗️' },
  { field: 'researchCount', label: 'Research', icon: '🔬' },
];

interface LeaderboardPanelProps {
  state: GameState;
}

export default function LeaderboardPanel({ state }: LeaderboardPanelProps) {
  const [sortBy, setSortBy] = useState<SortField>('netWorth');

  const entries = useMemo(() => {
    const all: LeaderboardEntry[] = [];

    // Player entry
    const playerBuildings = state.buildings.filter(b => b.isComplete).length;
    all.push({
      rank: 0,
      companyName: state.companyName || 'Your Company',
      title: null,
      netWorth: state.money,
      totalEarned: state.totalEarned,
      buildingCount: playerBuildings,
      researchCount: state.completedResearch.length,
      locationsUnlocked: state.unlockedLocations.length,
      isYou: true,
      isNPC: false,
    });

    // NPC entries
    if (state.npcCompanies) {
      for (const npc of state.npcCompanies) {
        all.push({
          rank: 0,
          companyName: npc.name,
          title: getNPCTitle(npc),
          netWorth: npc.money,
          totalEarned: npc.totalEarned,
          buildingCount: npc.buildingCount,
          researchCount: npc.completedResearch.length,
          locationsUnlocked: npc.unlockedLocations.length,
          isYou: false,
          isNPC: true,
        });
      }
    }

    // Sort and rank
    all.sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
    all.forEach((e, i) => { e.rank = i + 1; });

    return all;
  }, [state, sortBy]);

  const playerRank = entries.find(e => e.isYou)?.rank || 0;

  return (
    <div className="space-y-4">
      {/* Player Rank Summary */}
      <div className="hud-frame game-panel-glow p-4 text-center relative">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="absolute top-3 right-3">
          <ShareButton
            title="Space Tycoon — Galactic Leaderboard"
            description="See the top-ranked corporations in Space Tycoon on SpaceNexus."
            url={`${APP_URL}/space-tycoon/leaderboard`}
          />
        </div>
        <p className="game-label text-center">Your Rank</p>
        <p className="game-heading text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
          #{playerRank}
        </p>
        <p className="text-slate-500 text-xs mt-1">out of {entries.length} companies</p>
      </div>

      {/* Sort Tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sort leaderboard by">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.field}
            role="tab"
            aria-selected={sortBy === opt.field}
            onClick={() => setSortBy(opt.field)}
            className={`font-hud px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[38px] ${
              sortBy === opt.field ? 'game-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard — holo ranking rows */}
      <div className="hud-frame game-panel overflow-hidden" role="table" aria-label="Company leaderboard">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center gap-3 bg-white/[0.03] px-3 py-2" role="row">
          <span className="game-label w-12" role="columnheader">#</span>
          <span className="game-label flex-1" role="columnheader">Company</span>
          <span className="game-label text-right" role="columnheader">
            {SORT_OPTIONS.find(o => o.field === sortBy)?.label}
          </span>
        </div>
        <div className="game-scroll max-h-[520px] overflow-y-auto">
          {entries.map((entry) => {
            const medal = RANK_MEDAL[entry.rank];
            return (
              <div
                key={entry.companyName}
                role="row"
                className={`holo-row flex items-center gap-3 border-t border-white/[0.04] px-3 py-2.5 ${
                  entry.isYou ? 'holo-row-you' : ''
                }`}
              >
                <div className="w-12 flex items-center" role="cell">
                  {medal ? (
                    <span className={`rank-medal rank-medal-${medal.tone} w-7 h-7`} title={`Rank #${entry.rank}`}>
                      <Image src={`/game/ach-badge-${medal.badge}.webp`} alt={`Rank ${entry.rank} medal`} width={28} height={28} className="w-full h-full object-cover" />
                    </span>
                  ) : (
                    <span className="game-number text-slate-500 text-xs">#{entry.rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0" role="cell">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium truncate ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                      {entry.companyName}
                    </span>
                    {entry.isYou && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                        YOU
                      </span>
                    )}
                    {entry.isNPC && (
                      <span className="text-[9px] px-1 py-0.5 rounded text-slate-600" title="NPC company">NPC</span>
                    )}
                    {entry.title && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {entry.title}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right" role="cell">
                  <span className={`game-number text-xs ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                    {sortBy === 'netWorth' || sortBy === 'totalEarned'
                      ? formatMoney(entry[sortBy] as number)
                      : entry[sortBy]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competition info */}
      <p className="text-slate-600 text-[10px] text-center">
        NPC companies 🤖 mine resources, research tech, and expand across the solar system alongside you.
        Outperform them to climb the ranks!
      </p>
    </div>
  );
}
