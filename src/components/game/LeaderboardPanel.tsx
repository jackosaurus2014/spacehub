'use client';

import { useState, useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { getNPCTitle } from '@/lib/game/npc-companies';
import { formatMoney } from '@/lib/game/formulas';

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
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
        <p className="text-slate-400 text-xs mb-1">Your Rank</p>
        <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
          #{playerRank}
        </p>
        <p className="text-slate-500 text-xs mt-1">out of {entries.length} companies</p>
      </div>

      {/* Sort Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.field}
            onClick={() => setSortBy(opt.field)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortBy === opt.field
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03]">
              <th className="text-left text-slate-500 font-medium py-2 px-3 w-12">#</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3">Company</th>
              <th className="text-right text-slate-500 font-medium py-2 px-3">
                {SORT_OPTIONS.find(o => o.field === sortBy)?.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.companyName}
                className={`border-t border-white/[0.04] transition-colors ${
                  entry.isYou
                    ? 'bg-cyan-500/5 hover:bg-cyan-500/10'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <td className="py-2.5 px-3">
                  <span className={`text-xs font-bold ${
                    entry.rank === 1 ? 'text-amber-400' :
                    entry.rank === 2 ? 'text-slate-300' :
                    entry.rank === 3 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}`}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                      {entry.companyName}
                    </span>
                    {entry.isYou && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                        YOU
                      </span>
                    )}
                    {entry.isNPC && (
                      <span className="text-[9px] px-1 py-0.5 rounded text-slate-600">🤖</span>
                    )}
                    {entry.title && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {entry.title}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`font-mono text-xs ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                    {sortBy === 'netWorth' || sortBy === 'totalEarned'
                      ? formatMoney(entry[sortBy] as number)
                      : entry[sortBy]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Competition info */}
      <p className="text-slate-600 text-[10px] text-center">
        NPC companies 🤖 mine resources, research tech, and expand across the solar system alongside you.
        Outperform them to climb the ranks!
      </p>
    </div>
  );
}
