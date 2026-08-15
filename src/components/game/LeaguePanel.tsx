'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { formatMoney } from '@/lib/game/formulas';

// Rank 1-3 reuse existing achievement badge art as holo rank medals — same
// palette used across Leaderboard/Speed Run panels for a consistent "medal" language.
const RANK_MEDAL: Record<number, { badge: string; tone: 'gold' | 'silver' | 'bronze' }> = {
  1: { badge: 'transcendent', tone: 'gold' },
  2: { badge: 'benefactor', tone: 'silver' },
  3: { badge: 'industrialist', tone: 'bronze' },
};

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
      <div className="space-y-4 animate-pulse motion-reduce:animate-none" role="status" aria-live="polite" aria-label="Loading league data">
        <div className="h-24 bg-white/[0.04] rounded-xl" />
        <div className="h-16 bg-white/[0.04] rounded-xl" />
        <div className="h-64 bg-white/[0.04] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center" role="alert">
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
      className="hud-frame rounded-xl p-4 border"
      style={{
        borderColor: `${league.color}33`,
        background: `linear-gradient(135deg, ${league.color}10, ${league.color}05)`,
        '--hud-color': `${league.color}59`,
      } as CSSProperties}
    >
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{league.icon}</span>
          <div>
            <h3
              className="game-heading text-lg font-bold"
              style={{ color: league.color }}
            >
              {league.name} League
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="division-badge"
                style={{ borderColor: `${league.color}55`, color: league.color, background: `${league.color}14` }}
              >
                {league.icon} Division {league.number} / 8
              </span>
              <p className="text-slate-400 text-xs">
                {league.maxNetWorth
                  ? `${formatMoney(league.minNetWorth)} - ${formatMoney(league.maxNetWorth)}`
                  : `${formatMoney(league.minNetWorth)}+`}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="game-label">Season Pts</p>
          <p className="game-number text-white font-bold text-lg">{leagueProfile.seasonPoints}</p>
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
    <div className="hud-frame rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
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
            <p className="game-label">Your Score</p>
            <p className="game-number text-white font-bold text-sm">
              {formatScore(myEntry.score, metric.scoreType)}
            </p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <p className="game-label">Delta</p>
            <p className={`game-number font-bold text-sm ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {delta >= 0 ? '+' : ''}{metric.scoreType === 'percentage'
                ? formatMoney(delta)
                : delta.toFixed(0)}
            </p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <p className="game-label">Rank</p>
            <p className="game-number text-white font-bold text-sm">
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
    <div className="hud-frame rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-amber-400 text-xs font-semibold">Projected Rewards (Rank #{rank})</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="game-number text-white text-sm font-medium">
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
    <div className="hud-frame game-panel overflow-hidden" role="table" aria-label="Bracket standings">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      {/* Header */}
      <div className="bg-white/[0.03] px-3 py-2 flex items-center justify-between" role="row">
        <h4 className="game-label" role="columnheader">
          Bracket Standings
        </h4>
        <span className="text-slate-500 text-[10px]">{bracketSize} players</span>
      </div>

      {/* Holo ranking rows */}
      <div className="game-scroll max-h-[480px] overflow-y-auto">
        {standings.map((entry) => {
          const inPromo = entry.rank <= promotionZone;
          const inDemo = entry.rank > bracketSize - demotionZone;
          const medal = RANK_MEDAL[entry.rank];

          return (
            <div
              key={entry.rank}
              role="row"
              className={`holo-row flex items-center gap-3 border-t border-white/[0.04] px-3 py-2 ${
                inPromo ? 'zone-promotion' : inDemo ? 'zone-relegation' : ''
              } ${entry.isYou ? 'holo-row-you' : ''}`}
            >
              <div className="w-10 flex items-center" role="cell">
                {medal ? (
                  <span className={`rank-medal rank-medal-${medal.tone} w-6 h-6`} title={`Rank #${entry.rank}`}>
                    <Image src={`/game/ach-badge-${medal.badge}.webp`} alt={`Rank ${entry.rank} medal`} width={24} height={24} className="w-full h-full object-cover" />
                  </span>
                ) : (
                  <span className={`game-number text-xs ${inPromo ? 'text-emerald-400' : inDemo ? 'text-red-400' : 'text-slate-500'}`}>
                    #{entry.rank}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0" role="cell">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className={`text-sm font-medium truncate ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                    {entry.companyName}
                  </span>
                  {entry.isYou && (
                    <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                      YOU
                    </span>
                  )}
                  {entry.allianceTag && (
                    <span className="flex-shrink-0 text-[10px] text-slate-500">
                      [{entry.allianceTag}]
                    </span>
                  )}
                  {entry.shielded && (
                    <span className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Demotion shield active">
                      {'\uD83D\uDEE1'} Shielded
                    </span>
                  )}
                  {entry.promoted && (
                    <span className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Promoted this week">
                      {'\u2B06'} Promoted
                    </span>
                  )}
                  {entry.demoted && (
                    <span className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20" title="Demoted this week">
                      {'\u2B07'} Demoted
                    </span>
                  )}
                  {!entry.promoted && !entry.demoted && inPromo && (
                    <span className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {'\u25B2'} Promo Zone
                    </span>
                  )}
                  {!entry.promoted && !entry.demoted && inDemo && (
                    <span className="flex-shrink-0 text-[10px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      {'\u25BC'} Danger Zone
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right" role="cell">
                <span className={`game-number text-xs ${entry.isYou ? 'text-cyan-300' : 'text-white'}`}>
                  {formatScore(entry.score, metric.scoreType)}
                </span>
              </div>
              <div className="hidden sm:block w-20" role="cell">
                <div className="w-full bg-white/[0.06] rounded-full h-1.5 game-progress-shimmer">
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white/[0.02] px-3 py-2 flex items-center gap-4 text-[10px] text-slate-500 border-t border-white/[0.04]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {'\u25B2'} Promotion Zone (Top {promotionZone})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
          {'\u25BC'} Danger Zone (Bottom {demotionZone})
        </span>
      </div>
    </div>
  );
}
