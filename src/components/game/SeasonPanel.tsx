'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  BRACKETS,
  SEASON_PASS_TIERS,
  SP_PER_TIER,
  getSeasonAccentClasses,
  formatSeasonCountdown,
  getTierReward,
  getSeasonIcon,
  type SeasonType,
} from '@/lib/game/seasonal-events';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeasonEvent {
  id: string;
  seasonType: string;
  seasonNumber: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: string;
  phase: string;
  participantCount: number;
  countdown: string;
  countdownLabel: string;
  seasonDefinition: {
    name: string;
    description: string;
    themeColor: string;
    accentColor: string;
    icon: string;
    uniqueMechanic: string;
    scoringRules: { id: string; name: string; weight: number; description: string }[];
    durationDays: number;
  } | null;
  metadata: unknown;
}

interface Participation {
  id: string;
  seasonPoints: number;
  currentTier: number;
  bracket: number;
  totalScore: number;
  rank: number | null;
  rewardsClaimed: unknown;
  createdAt: string;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  spReward: number;
  progress: number;
  expiresAt: number;
}

interface LeaderboardEntry {
  rank: number;
  companyName: string;
  title: string | null;
  totalScore: number;
  seasonPoints: number;
  currentTier: number;
  bracket: number;
  bracketLabel: string;
  allianceTag: string | null;
}

interface PlayerLeaderboardEntry extends LeaderboardEntry {
  bracketRank: number;
}

interface SeasonData {
  activeEvent: SeasonEvent | null;
  upcomingEvent: SeasonEvent | null;
  recentlyEnded: SeasonEvent | null;
  participation: Participation | null;
  dailyChallenges: DailyChallenge[];
  player: {
    eventTokens: number;
    netWorth: number;
    bracketNumber: number;
    bracketLabel: string;
  } | null;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  playerEntry: PlayerLeaderboardEntry | null;
  totalParticipants: number;
  brackets: { number: number; label: string; count: number }[];
}

type PanelTab = 'overview' | 'challenges' | 'pass' | 'leaderboard';

interface SeasonPanelProps {
  state: GameState;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SeasonPanel({ state }: SeasonPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [seasonData, setSeasonData] = useState<SeasonData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [leaderboardBracket, setLeaderboardBracket] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch season data
  const fetchSeasonData = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/seasons');
      if (res.ok) {
        const data = await res.json();
        setSeasonData(data);
        setError(null);
      }
    } catch {
      setError('Failed to load seasonal event data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (leaderboardBracket) params.set('bracket', leaderboardBracket.toString());
      const res = await fetch(`/api/space-tycoon/seasons/leaderboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data);
      }
    } catch {
      // Silently fail for leaderboard
    }
  }, [leaderboardBracket]);

  useEffect(() => {
    fetchSeasonData();
  }, [fetchSeasonData]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  // Countdown timer
  useEffect(() => {
    const event = seasonData?.activeEvent || seasonData?.upcomingEvent;
    if (!event) return;

    const update = () => {
      const now = Date.now();
      const endMs = new Date(event.endsAt).getTime();
      const startMs = new Date(event.startsAt).getTime();
      const target = now >= startMs ? endMs : startMs;
      setCountdown(formatSeasonCountdown(target - now));
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [seasonData]);

  // Join season handler
  const handleJoinSeason = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/space-tycoon/seasons/join', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSeasonData();
      } else {
        setError(data.error || 'Failed to join event');
      }
    } catch {
      setError('Network error while joining');
    } finally {
      setJoining(false);
    }
  };

  // ─── Render States ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-32 bg-slate-800/50 rounded-xl" />
        <div className="h-20 bg-slate-800/50 rounded-xl" />
        <div className="h-48 bg-slate-800/50 rounded-xl" />
      </div>
    );
  }

  const event = seasonData?.activeEvent || seasonData?.upcomingEvent;
  if (!event && !seasonData?.recentlyEnded) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">&#x1F30C;</div>
        <h3 className="text-white text-lg font-bold mb-1">No Active Season</h3>
        <p className="text-slate-400 text-sm">
          The next seasonal event has not been announced yet. Check back soon!
        </p>
        {seasonData?.player && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <span className="text-purple-400 text-xs">Event Tokens:</span>
            <span className="text-white text-sm font-bold">{seasonData.player.eventTokens.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }

  const displayEvent = event || seasonData!.recentlyEnded!;
  const seasonType = displayEvent.seasonType as SeasonType;
  const accent = getSeasonAccentClasses(seasonType);
  const participation = seasonData?.participation;
  const isParticipating = !!participation;
  const isJoinable = ['REGISTRATION', 'LATE_JOIN', 'ACTIVE'].includes(displayEvent.phase);
  const isActive = ['ACTIVE', 'LATE_JOIN', 'FINAL_SPRINT'].includes(displayEvent.phase);

  const tabs: { id: PanelTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '\u2B50' },
    { id: 'challenges', label: 'Challenges', icon: '\u2694\uFE0F' },
    { id: 'pass', label: 'Season Pass', icon: '\uD83C\uDFC6' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '\uD83D\uDCCA' },
  ];

  return (
    <div className="space-y-3">
      {/* Season Banner */}
      <div className={`rounded-xl border ${accent.border} bg-gradient-to-r ${accent.gradient} p-4 relative overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-2 right-4 text-6xl">{getSeasonIcon(seasonType)}</div>
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{getSeasonIcon(seasonType)}</span>
                <h2 className="text-white text-lg font-bold">{displayEvent.title}</h2>
              </div>
              {displayEvent.seasonDefinition && (
                <p className={`text-xs ${accent.text} font-medium`}>
                  Season {displayEvent.seasonNumber} &middot; {displayEvent.seasonDefinition.durationDays} Days
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                {displayEvent.countdownLabel}
              </span>
              <p className="text-white text-lg font-mono font-bold">{countdown || displayEvent.countdown}</p>
            </div>
          </div>

          <p className="text-slate-300 text-xs mb-3 line-clamp-2">
            {displayEvent.description}
          </p>

          {/* Phase badge + participant count */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              displayEvent.phase === 'FINAL_SPRINT'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : displayEvent.phase === 'ACTIVE' || displayEvent.phase === 'LATE_JOIN'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : displayEvent.phase === 'REGISTRATION'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}>
              {displayEvent.phase.replace('_', ' ')}
            </span>
            <span className="text-slate-500 text-[10px]">
              {displayEvent.participantCount} participant{displayEvent.participantCount !== 1 ? 's' : ''}
            </span>
            {displayEvent.phase === 'FINAL_SPRINT' && (
              <span className="text-red-400 text-[10px] font-bold animate-pulse">
                1.25x SP Bonus!
              </span>
            )}
          </div>

          {/* Join button / Status */}
          {!isParticipating && isJoinable && (
            <button
              onClick={handleJoinSeason}
              disabled={joining}
              className={`mt-3 w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all ${
                joining
                  ? 'bg-slate-700 cursor-wait'
                  : `bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98]`
              }`}
            >
              {joining ? 'Joining...' : 'Join Season'}
            </button>
          )}

          {isParticipating && (
            <div className="mt-3 flex items-center gap-3">
              <div className={`flex-1 rounded-lg ${accent.bg} border ${accent.border} p-2 text-center`}>
                <span className="text-slate-400 text-[10px] block">Score</span>
                <span className="text-white text-sm font-bold">{Math.round(participation!.totalScore).toLocaleString()}</span>
              </div>
              <div className={`flex-1 rounded-lg ${accent.bg} border ${accent.border} p-2 text-center`}>
                <span className="text-slate-400 text-[10px] block">Tier</span>
                <span className="text-white text-sm font-bold">{participation!.currentTier}/{SEASON_PASS_TIERS}</span>
              </div>
              <div className={`flex-1 rounded-lg ${accent.bg} border ${accent.border} p-2 text-center`}>
                <span className="text-slate-400 text-[10px] block">Rank</span>
                <span className="text-white text-sm font-bold">
                  {participation!.rank ? `#${participation!.rank}` : '--'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Token balance */}
      {seasonData?.player && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-sm">{'\u2728'}</span>
            <span className="text-purple-300 text-xs font-medium">Event Tokens</span>
          </div>
          <span className="text-white text-sm font-bold">{seasonData.player.eventTokens.toLocaleString()}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/30 rounded-lg p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
              activeTab === tab.id
                ? `${accent.bg} ${accent.text} border ${accent.border}`
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab event={displayEvent} participation={participation} accent={accent} />
      )}
      {activeTab === 'challenges' && (
        <ChallengesTab
          challenges={seasonData?.dailyChallenges || []}
          participation={participation}
          accent={accent}
          isActive={isActive}
        />
      )}
      {activeTab === 'pass' && (
        <SeasonPassTab participation={participation} accent={accent} />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardTab
          data={leaderboardData}
          bracketFilter={leaderboardBracket}
          onBracketChange={setLeaderboardBracket}
          accent={accent}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  event,
  participation,
  accent,
}: {
  event: SeasonEvent;
  participation: Participation | null;
  accent: ReturnType<typeof getSeasonAccentClasses>;
}) {
  const def = event.seasonDefinition;

  return (
    <div className="space-y-3">
      {/* Unique Mechanic */}
      {def && (
        <div className={`rounded-lg border ${accent.border} ${accent.bg} p-3`}>
          <h4 className={`text-xs font-bold ${accent.text} mb-1`}>Unique Mechanic</h4>
          <p className="text-slate-300 text-xs leading-relaxed">{def.uniqueMechanic}</p>
        </div>
      )}

      {/* Scoring Rules */}
      {def && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <h4 className="text-white text-xs font-bold mb-2">Scoring Categories</h4>
          <div className="space-y-1.5">
            {def.scoringRules.map(rule => (
              <div key={rule.id} className="flex items-center gap-2">
                <div className={`w-8 text-right text-[10px] font-bold ${accent.text}`}>
                  {Math.round(rule.weight * 100)}%
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-1.5 rounded-full ${accent.bg}`}
                      style={{ width: `${rule.weight * 100}%`, minWidth: '8px' }}
                    />
                    <span className="text-slate-300 text-[11px]">{rule.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season-specific info */}
      {def && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <h4 className="text-white text-xs font-bold mb-2">Starting Conditions</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400">Duration</span>
              <p className="text-white font-medium">{def.durationDays} days</p>
            </div>
            <div>
              <span className="text-slate-400">Status</span>
              <p className="text-white font-medium capitalize">{event.phase.toLowerCase().replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-slate-400">Participants</span>
              <p className="text-white font-medium">{event.participantCount}</p>
            </div>
            {participation && (
              <div>
                <span className="text-slate-400">Your Bracket</span>
                <p className="text-white font-medium">
                  {BRACKETS[Math.max(0, Math.min(4, participation.bracket - 1))]?.label || 'Unknown'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reward Preview */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <h4 className="text-white text-xs font-bold mb-2">Top Rewards</h4>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400">{'\uD83E\uDD47'}</span>
              <span className="text-slate-300">1st Place</span>
            </div>
            <span className="text-yellow-400 font-medium">10,000 Tokens + Legendary</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300">{'\uD83E\uDD48'}</span>
              <span className="text-slate-300">2nd Place</span>
            </div>
            <span className="text-slate-400 font-medium">7,500 Tokens + Epic</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-600">{'\uD83E\uDD49'}</span>
              <span className="text-slate-300">3rd Place</span>
            </div>
            <span className="text-slate-400 font-medium">5,000 Tokens + Epic</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{'\u2B50'}</span>
              <span className="text-slate-400">All Participants</span>
            </div>
            <span className="text-slate-500 font-medium">200+ Tokens</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Challenges Tab ───────────────────────────────────────────────────────────

function ChallengesTab({
  challenges,
  participation,
  accent,
  isActive,
}: {
  challenges: DailyChallenge[];
  participation: Participation | null;
  accent: ReturnType<typeof getSeasonAccentClasses>;
  isActive: boolean;
}) {
  if (!participation) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm">Join the season to see your daily challenges.</p>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm">Challenges are available when the event is active.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Daily Challenges Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-white text-xs font-bold">Daily Challenges</h4>
        <span className="text-slate-500 text-[10px]">
          Resets at midnight UTC
        </span>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          No challenges available today.
        </div>
      ) : (
        challenges.map(challenge => {
          const pct = challenge.target > 0
            ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
            : 0;
          const isComplete = challenge.progress >= challenge.target;

          return (
            <div
              key={challenge.id}
              className={`rounded-lg border p-3 transition-all ${
                isComplete
                  ? 'border-green-500/30 bg-green-500/5'
                  : `${accent.border} bg-slate-800/30`
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {isComplete && <span className="text-green-400 text-xs">{'\u2705'}</span>}
                    <h5 className={`text-xs font-bold ${isComplete ? 'text-green-400' : 'text-white'}`}>
                      {challenge.title}
                    </h5>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">{challenge.description}</p>
                </div>
                <div className={`text-right px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isComplete
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : `${accent.bg} ${accent.text} border ${accent.border}`
                }`}>
                  +{challenge.spReward} SP
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-500 text-[10px]">
                    {challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()}
                  </span>
                  <span className={`text-[10px] font-medium ${isComplete ? 'text-green-400' : accent.text}`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isComplete
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Weekly milestone preview */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <h4 className="text-white text-xs font-bold mb-2">Weekly Milestones</h4>
        <div className="space-y-1.5 text-[11px]">
          <MilestoneRow label="Complete 5 daily challenges this week" reward={100} done={false} accent={accent} />
          <MilestoneRow label="Earn 500 SP this week" reward={150} done={false} accent={accent} />
          <MilestoneRow label="Reach a new tier this week" reward={200} done={false} accent={accent} />
        </div>
      </div>
    </div>
  );
}

function MilestoneRow({
  label,
  reward,
  done,
  accent,
}: {
  label: string;
  reward: number;
  done: boolean;
  accent: ReturnType<typeof getSeasonAccentClasses>;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={done ? 'text-green-400' : 'text-slate-600'}>{done ? '\u2705' : '\u25CB'}</span>
        <span className={done ? 'text-green-400 line-through' : 'text-slate-400'}>{label}</span>
      </div>
      <span className={`text-[10px] font-bold ${done ? 'text-green-400' : accent.text}`}>+{reward} SP</span>
    </div>
  );
}

// ─── Season Pass Tab ──────────────────────────────────────────────────────────

function SeasonPassTab({
  participation,
  accent,
}: {
  participation: Participation | null;
  accent: ReturnType<typeof getSeasonAccentClasses>;
}) {
  const currentSP = participation?.seasonPoints || 0;
  const currentTier = participation?.currentTier || 0;
  const spInCurrentTier = currentSP - currentTier * SP_PER_TIER;
  const overallProgress = Math.min(100, Math.round((currentSP / (SEASON_PASS_TIERS * SP_PER_TIER)) * 100));

  // Show tiers around current position
  const startTier = Math.max(1, currentTier - 1);
  const endTier = Math.min(SEASON_PASS_TIERS, startTier + 9);
  const visibleTiers = [];
  for (let t = startTier; t <= endTier; t++) {
    visibleTiers.push(t);
  }

  return (
    <div className="space-y-3">
      {/* Overall Progress */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-white text-xs font-bold">Season Pass Progress</h4>
          <span className={`text-xs font-bold ${accent.text}`}>{currentSP.toLocaleString()} SP</span>
        </div>

        {/* Overall bar */}
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Tier {currentTier} / {SEASON_PASS_TIERS}</span>
          <span className="text-slate-500">{overallProgress}% Complete</span>
        </div>

        {/* Current tier progress */}
        {currentTier < SEASON_PASS_TIERS && (
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-slate-400 text-[10px]">Next Tier: {currentTier + 1}</span>
              <span className={`text-[10px] ${accent.text}`}>{spInCurrentTier} / {SP_PER_TIER} SP</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500`}
                style={{ width: `${Math.round((spInCurrentTier / SP_PER_TIER) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tier List */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
        <h4 className="text-white text-xs font-bold mb-2">Tier Rewards</h4>
        <div className="space-y-1">
          {visibleTiers.map(tier => {
            const reward = getTierReward(tier);
            const isReached = tier <= currentTier;
            const isCurrent = tier === currentTier + 1;
            const isBonus = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].includes(tier);

            return (
              <div
                key={tier}
                className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                  isCurrent
                    ? `${accent.bg} border ${accent.border}`
                    : isReached
                      ? 'bg-green-500/5 border border-green-500/10'
                      : 'border border-transparent'
                }`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  isReached
                    ? 'bg-green-500/20 text-green-400'
                    : isBonus
                      ? `${accent.bg} ${accent.text}`
                      : 'bg-slate-700/50 text-slate-500'
                }`}>
                  {isReached ? '\u2713' : tier}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] truncate ${
                    isReached ? 'text-green-400' : 'text-slate-300'
                  }`}>
                    {reward.description}
                  </span>
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isReached ? 'text-green-500' : 'text-slate-500'
                }`}>
                  {tier * SP_PER_TIER} SP
                </span>
              </div>
            );
          })}
        </div>

        {/* Navigation hint */}
        <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500">
          {startTier > 1 && <span>... {startTier - 1} more above</span>}
          {endTier < SEASON_PASS_TIERS && <span>... {SEASON_PASS_TIERS - endTier} more below</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────

function LeaderboardTab({
  data,
  bracketFilter,
  onBracketChange,
  accent,
}: {
  data: LeaderboardData | null;
  bracketFilter: number | null;
  onBracketChange: (b: number | null) => void;
  accent: ReturnType<typeof getSeasonAccentClasses>;
}) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-800/50 rounded w-32 mx-auto" />
          <div className="h-32 bg-slate-800/50 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bracket filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onBracketChange(null)}
          className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
            bracketFilter === null
              ? `${accent.bg} ${accent.text} border ${accent.border}`
              : 'text-slate-400 bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30'
          }`}
        >
          All ({data.totalParticipants})
        </button>
        {data.brackets.map(b => (
          <button
            key={b.number}
            onClick={() => onBracketChange(b.number)}
            className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
              bracketFilter === b.number
                ? `${accent.bg} ${accent.text} border ${accent.border}`
                : 'text-slate-400 bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30'
            }`}
          >
            {b.label} ({b.count})
          </button>
        ))}
      </div>

      {/* Player's position */}
      {data.playerEntry && (
        <div className={`rounded-lg border ${accent.border} ${accent.bg} p-2.5`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-md ${accent.bg} border ${accent.border} flex items-center justify-center`}>
              <span className={`text-xs font-bold ${accent.text}`}>#{data.playerEntry.bracketRank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white text-xs font-bold truncate block">
                {data.playerEntry.companyName}
              </span>
              <span className="text-slate-400 text-[10px]">
                {data.playerEntry.bracketLabel} Bracket &middot; Tier {data.playerEntry.currentTier}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${accent.text}`}>
                {Math.round(data.playerEntry.totalScore).toLocaleString()}
              </span>
              <span className="text-slate-500 text-[10px] block">points</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard entries */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50 text-[10px] text-slate-500 uppercase tracking-wider">
          <span className="w-6">#</span>
          <span className="flex-1">Company</span>
          <span className="w-12 text-right">Tier</span>
          <span className="w-16 text-right">Score</span>
        </div>

        {data.entries.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">No participants yet</div>
        ) : (
          data.entries.map((entry, idx) => {
            const isPlayer = data.playerEntry && entry.companyName === data.playerEntry.companyName;
            return (
              <div
                key={`${entry.rank}-${entry.companyName}`}
                className={`flex items-center gap-2 px-3 py-2 border-b border-slate-700/20 last:border-0 transition-colors ${
                  isPlayer ? `${accent.bg}` : idx % 2 === 0 ? '' : 'bg-slate-800/10'
                }`}
              >
                <span className={`w-6 text-xs font-bold ${
                  entry.rank === 1 ? 'text-yellow-400' :
                  entry.rank === 2 ? 'text-slate-300' :
                  entry.rank === 3 ? 'text-amber-600' :
                  'text-slate-500'
                }`}>
                  {entry.rank <= 3 ? ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][entry.rank] : entry.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] truncate block ${isPlayer ? 'text-white font-bold' : 'text-slate-300'}`}>
                    {entry.allianceTag && (
                      <span className="text-slate-500">[{entry.allianceTag}] </span>
                    )}
                    {entry.companyName}
                  </span>
                  {entry.title && (
                    <span className="text-purple-400 text-[9px]">{entry.title}</span>
                  )}
                </div>
                <span className="w-12 text-right text-slate-400 text-[10px]">{entry.currentTier}</span>
                <span className={`w-16 text-right text-xs font-medium ${isPlayer ? accent.text : 'text-white'}`}>
                  {Math.round(entry.totalScore).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Participant count */}
      <div className="text-center text-[10px] text-slate-500">
        Showing top {data.entries.length} of {data.totalParticipants} participants
      </div>
    </div>
  );
}
