'use client';

import { useState, useEffect, useCallback } from 'react';
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
  isYou?: boolean;
}

type SortField = 'netWorth' | 'totalEarned' | 'buildingCount' | 'researchCount';

const SORT_OPTIONS: { field: SortField; label: string; icon: string }[] = [
  { field: 'netWorth', label: 'Net Worth', icon: '💰' },
  { field: 'totalEarned', label: 'Total Earned', icon: '📈' },
  { field: 'buildingCount', label: 'Buildings', icon: '🏗️' },
  { field: 'researchCount', label: 'Research', icon: '🔬' },
];

export default function LeaderboardPanel() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<SortField>('netWorth');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/space-tycoon/leaderboard?sort=${sortBy}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      } else {
        // API might not exist yet — show placeholder
        setEntries(getPlaceholderData());
      }
    } catch {
      // Offline or API not deployed — show placeholder
      setEntries(getPlaceholderData());
    }
    setLoading(false);
  }, [sortBy]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="space-y-4">
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
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse text-slate-500 text-sm">Loading leaderboard...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchLeaderboard} className="text-xs text-cyan-400 mt-2">Retry</button>
          </div>
        ) : (
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
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className={`border-t border-white/[0.04] ${entry.isYou ? 'bg-cyan-500/5' : 'hover:bg-white/[0.02]'}`}
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
                        {entry.isYou && <span className="text-cyan-500 text-[10px] ml-1">(You)</span>}
                      </span>
                      {entry.title && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {entry.title}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-white font-mono text-xs">
                      {sortBy === 'netWorth' || sortBy === 'totalEarned'
                        ? formatMoney(entry[sortBy])
                        : entry[sortBy]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info */}
      <p className="text-slate-600 text-[10px] text-center">
        Leaderboard updates when you sync your game. Sign in to appear on the leaderboard.
      </p>
    </div>
  );
}

/** Placeholder data when API isn't available yet */
function getPlaceholderData(): LeaderboardEntry[] {
  const names = [
    'Orbital Dynamics Corp', 'Stellar Industries', 'Nova Aerospace',
    'Quantum Launch Systems', 'Titan Mining Co', 'Artemis Ventures',
    'Deep Space Holdings', 'Cislunar Partners', 'Helios Energy',
    'Frontier Spacecraft',
  ];
  return names.map((name, i) => ({
    rank: i + 1,
    companyName: name,
    title: i === 0 ? 'Solar Emperor' : i < 3 ? 'Tycoon' : null,
    netWorth: Math.round(1_000_000_000_000 / (i + 1)),
    totalEarned: Math.round(2_000_000_000_000 / (i + 1)),
    buildingCount: Math.round(50 / (i * 0.3 + 1)),
    researchCount: Math.round(37 / (i * 0.4 + 1)),
    locationsUnlocked: Math.max(2, 11 - i),
  }));
}
