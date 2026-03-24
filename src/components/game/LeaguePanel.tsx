'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/game/formulas';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeagueInfo {
  number: number;
  name: string;
  color: string;
  icon: string;
  minNetWorth: number;
  maxNetWorth: number | null;
}

interface MetricInfo {
  slug: string;
  name: string;
  description: string;
  icon: string;
  scoreType: 'percentage' | 'absolute';
}

interface SeasonInfo {
  id: string;
  seasonNumber: number;
  weekNumber: number;
  metricSlug: string;
  startsAt: string;
  endsAt: string;
}

interface StandingEntry {
  rank: number;
  companyName: string;
  allianceTag: string | null;
  score: number;
  startValue: number;
  currentValue: number;
  isYou: boolean;
  promoted: boolean;
  demoted: boolean;
  shielded: boolean;
  inPromotionZone: boolean;
  inDemotionZone: boolean;
}

interface MyEntry {
  rank: number | null;
  score: number;
  startValue: number;
  currentValue: number;
  promoted: boolean;
  demoted: boolean;
  shielded: boolean;
}

interface ProjectedRewards {
  cashReward: number;
  title: string | null;
  boostType: 'construction' | 'research' | null;
  boostMultiplier: number;
  boostDurationSeconds: number;
}

interface LeagueProfile {
  currentLeague: number;
  peakLeague: number;
  promotionShield: boolean;
  seasonPoints: number;
  totalWeeksPlayed: number;
}

interface LeagueData {
  league: LeagueInfo;
  metric: MetricInfo;
  season: SeasonInfo | null;
  bracket: { bracketId: string; league: number; bracketIndex: number; playerCount: number } | null;
  standings: StandingEntry[];
  myEntry: MyEntry | null;
  projectedRewards: ProjectedRewards | null;
  timeRemainingMs: number;
  weekId: number;
  promotionZone: number;
  demotionZone: number;
  bracketSize: number;
  leagueProfile: LeagueProfile;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function formatScore(score: number, scoreType: 'percentage' | 'absolute'): string {
  if (scoreType === 'percentage') return `${score.toFixed(2)}%`;
  return score.toFixed(1);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeaguePanel() {
  const [data, setData] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagueData = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/leagues');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to fetch league data');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load league data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeagueData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeagueData, 60_000);
    return () => clearInterval(interval);
  }, [fetchLeagueData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-white/[0.04] rounded-xl" />
        <div className="h-16 bg-white/[0.04] rounded-xl" />
        <div className="h-64 bg-white/[0.04] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchLeagueData(); }}
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { league, metric, standings, myEntry, projectedRewards, leagueProfile, season } = data;

  return (
    <div className="space-y-4">
      {/* League Banner */}
      <LeagueBanner league={league} leagueProfile={leagueProfile} />

      {/* Weekly Challenge Card */}
      <WeeklyChallengeCard
        metric={metric}
        myEntry={myEntry}
        timeRemainingMs={data.timeRemainingMs}
        season={season}
      />

      {/* Projected Rewards */}
      {projectedRewards && myEntry?.rank && (
        <RewardsCard rank={myEntry.rank} rewards={projectedRewards} />
      )}

      {/* Bracket Standings */}
      {standings.length > 0 ? (
        <BracketStandings
          standings={standings}
          promotionZone={data.promotionZone}
          demotionZone={data.demotionZone}
          metric={metric}
        />
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-slate-400 text-sm">No active bracket this week.</p>
          <p className="text-slate-500 text-xs mt-1">
            Keep playing! You will be placed in a bracket when the next season starts.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function LeagueBanner({ league, leagueProfile }: { league: LeagueInfo; leagueProfile: LeagueProfile }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        borderColor: `${league.color}33`,
        background: `linear-gradient(135deg, ${league.color}10, ${league.color}05)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{league.icon}</span>
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: league.color }}
            >
              {league.name} League
            </h3>
            <p className="text-slate-400 text-xs">
              Tier {league.number} of 8
              {league.maxNetWorth
                ? ` \u00B7 ${formatMoney(league.minNetWorth)} - ${formatMoney(league.maxNetWorth)}`
                : ` \u00B7 ${formatMoney(league.minNetWorth)}+`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Season Pts</p>
          <p className="text-white font-bold text-lg">{leagueProfile.seasonPoints}</p>
        </div>
      </div>

      {/* League progress indicators */}
      <div className="flex items-center gap-2 mt-3">
        {Array.from({ length: 8 }, (_, i) => {
          const tierNum = i + 1;
          const isCurrent = tierNum === leagueProfile.currentLeague;
          const isPeak = tierNum === leagueProfile.peakLeague;
          return (
            <div
              key={tierNum}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                isCurrent ? 'ring-1 ring-white/30' : ''
              }`}
              style={{
                backgroundColor: tierNum <= leagueProfile.currentLeague ? league.color : 'rgba(255,255,255,0.06)',
                opacity: tierNum <= leagueProfile.currentLeague ? 1 : 0.3,
              }}
              title={`Tier ${tierNum}${isCurrent ? ' (current)' : ''}${isPeak ? ' (peak)' : ''}`}
            />
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mt-3 text-xs">
        <span className="text-slate-500">
          Weeks played: <span className="text-slate-300">{leagueProfile.totalWeeksPlayed}</span>
        </span>
        {leagueProfile.promotionShield && (
          <span className="text-amber-400">Demotion Shield Active</span>
        )}
        {leagueProfile.peakLeague > leagueProfile.currentLeague && (
          <span className="text-slate-500">
            Peak: Tier {leagueProfile.peakLeague}
          </span>
        )}
      </div>
    </div>
  );
}

function WeeklyChallengeCard({
  metric,
  myEntry,
  timeRemainingMs,
  season,
}: {
  metric: MetricInfo;
  myEntry: MyEntry | null;
  timeRemainingMs: number;
  season: SeasonInfo | null;
}) {
  const delta = myEntry ? myEntry.currentValue - myEntry.startValue : 0;

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{metric.icon}</span>
          <div>
            <h4 className="text-sm font-semibold text-indigo-300">This Week&apos;s Challenge</h4>
            <p className="text-white font-medium">{metric.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">{formatTimeRemaining(timeRemainingMs)}</p>
          {season && (
            <p className="text-slate-500 text-[10px]">Season #{season.seasonNumber}</p>
          )}
        </div>
      </div>

      <p className="text-slate-400 text-xs mb-3">{metric.description}</p>

      {myEntry && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <p className="text-slate-500 text-[10px] uppercase">Your Score</p>
            <p className="text-white font-bold text-sm">
              {formatScore(myEntry.score, metric.scoreType)}
            </p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <p className="text-slate-500 text-[10px] uppercase">Delta</p>
            <p className={`font-bold text-sm ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {delta >= 0 ? '+' : ''}{metric.scoreType === 'percentage'
                ? formatMoney(delta)
                : delta.toFixed(0)}
            </p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <p className="text-slate-500 text-[10px] uppercase">Rank</p>
            <p className="text-white font-bold text-sm">
              {myEntry.rank ? `#${myEntry.rank}` : '--'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardsCard({ rank, rewards }: { rank: number; rewards: ProjectedRewards }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-amber-400 text-xs font-semibold">Projected Rewards (Rank #{rank})</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-white text-sm font-medium">
              {formatMoney(rewards.cashReward)}
            </span>
            {rewards.title && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                {rewards.title}
              </span>
            )}
            {rewards.boostType && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">
                {rewards.boostMultiplier}x {rewards.boostType === 'construction' ? 'Build' : 'Research'} ({Math.round(rewards.boostDurationSeconds / 3600)}h)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketStandings({
  standings,
  promotionZone,
  demotionZone,
  metric,
}: {
  standings: StandingEntry[];
  promotionZone: number;
  demotionZone: number;
  metric: MetricInfo;
}) {
  const bracketSize = standings.length;
  const maxScore = Math.max(...standings.map(s => s.score), 1);

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="bg-white/[0.03] px-3 py-2 flex items-center justify-between">
        <h4 className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          Bracket Standings
        </h4>
        <span className="text-slate-500 text-[10px]">{bracketSize} players</span>
      </div>

      {/* Table */}
      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
            <tr>
              <th className="text-left text-slate-500 font-medium py-2 px-3 w-12">#</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3">Company</th>
              <th className="text-right text-slate-500 font-medium py-2 px-3 w-24">Score</th>
              <th className="text-right text-slate-500 font-medium py-2 px-3 w-20 hidden sm:table-cell">Bar</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => {
              const inPromo = entry.rank <= promotionZone;
              const inDemo = entry.rank > bracketSize - demotionZone;

              let zoneBg = '';
              let zoneIndicator = '';
              if (inPromo) {
                zoneBg = 'bg-emerald-500/[0.04]';
                zoneIndicator = 'border-l-2 border-l-emerald-500';
              } else if (inDemo) {
                zoneBg = 'bg-red-500/[0.04]';
                zoneIndicator = 'border-l-2 border-l-red-500';
              }

              return (
                <tr
                  key={entry.rank}
                  className={`border-t border-white/[0.04] transition-colors ${zoneBg} ${zoneIndicator} ${
                    entry.isYou
                      ? 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.12]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="py-2 px-3">
                    <span className={`text-xs font-bold ${
                      entry.rank === 1 ? 'text-amber-400' :
                      entry.rank === 2 ? 'text-slate-300' :
                      entry.rank === 3 ? 'text-amber-600' :
                      inPromo ? 'text-emerald-400' :
                      inDemo ? 'text-red-400' :
                      'text-slate-500'
                    }`}>
                      {entry.rank === 1 ? '\uD83E\uDD47' : entry.rank === 2 ? '\uD83E\uDD48' : entry.rank === 3 ? '\uD83E\uDD49' : `${entry.rank}`}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm font-medium truncate ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                        {entry.companyName}
                      </span>
                      {entry.isYou && (
                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                          YOU
                        </span>
                      )}
                      {entry.allianceTag && (
                        <span className="flex-shrink-0 text-[9px] text-slate-500">
                          [{entry.allianceTag}]
                        </span>
                      )}
                      {entry.shielded && (
                        <span className="flex-shrink-0 text-[9px] text-amber-400" title="Demotion shield active">
                          {'\uD83D\uDEE1'}
                        </span>
                      )}
                      {entry.promoted && (
                        <span className="flex-shrink-0 text-[9px] text-emerald-400" title="Promoted">
                          {'\u2B06'}
                        </span>
                      )}
                      {entry.demoted && (
                        <span className="flex-shrink-0 text-[9px] text-red-400" title="Demoted">
                          {'\u2B07'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`font-mono text-xs ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                      {formatScore(entry.score, metric.scoreType)}
                    </span>
                  </td>
                  <td className="py-2 px-3 hidden sm:table-cell">
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (entry.score / maxScore) * 100)}%`,
                          backgroundColor: entry.isYou
                            ? '#22d3ee'
                            : inPromo
                            ? '#22c55e'
                            : inDemo
                            ? '#ef4444'
                            : '#6366f1',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-white/[0.02] px-3 py-2 flex items-center gap-4 text-[10px] text-slate-500 border-t border-white/[0.04]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Promotion Zone (Top {promotionZone})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Danger Zone (Bottom {demotionZone})
        </span>
      </div>
    </div>
  );
}
