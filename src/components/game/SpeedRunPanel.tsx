'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  SPEED_RUN_MILESTONES,
  BRACKETS,
  formatElapsedTime,
  getPrestigeBracket,
  getBracketDisplayName,
  checkMilestoneCompletion,
} from '@/lib/game/speed-runs';
import type { SpeedRunBracket } from '@/lib/game/speed-runs';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActiveAttempt {
  id: string;
  prestigeLevel: number;
  bracket: string;
  bracketName: string;
  startedAtMs: number;
  completedAtMs: number | null;
  durationSeconds: number | null;
  elapsedMs: number;
  elapsedFormatted: string;
  rank: number | null;
  isCompleted: boolean;
}

interface LeaderboardEntry {
  rank: number;
  companyName: string;
  allianceTag?: string | null;
  bracket: string;
  bracketName: string;
  durationSeconds: number;
  elapsedFormatted: string;
  prestigeLevel: number;
  completedAt: number;
  isCurrentPlayer: boolean;
}

interface ChallengeInfo {
  weekId: number;
  milestoneId: string;
  milestoneName: string;
  milestoneDescription: string;
  milestoneTier: string;
  compositeMilestoneId: string;
  compositeMilestoneName: string;
  compositeMilestoneDescription: string;
  timeRemaining: number;
  participantCount: number;
}

interface SpeedRunData {
  currentChallenge: ChallengeInfo;
  nextChallenge: {
    milestoneId: string;
    milestoneName: string;
    milestoneTier: string;
    compositeMilestoneId: string;
    compositeMilestoneName: string;
  };
  activeAttempt: ActiveAttempt | null;
  leaderboard: LeaderboardEntry[];
}

// ─── Sub-Tabs ───────────────────────────────────────────────────────────────

type SpeedRunTab = 'overview' | 'leaderboard' | 'hallOfFame';

const TAB_OPTIONS: { id: SpeedRunTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'hallOfFame', label: 'Hall of Fame' },
];

// ─── Bracket Colors ─────────────────────────────────────────────────────────

const BRACKET_COLORS: Record<SpeedRunBracket, string> = {
  rookie: 'text-slate-300',
  veteran: 'text-green-400',
  elite: 'text-blue-400',
  grandmaster: 'text-purple-400',
};

const BRACKET_BG: Record<SpeedRunBracket, string> = {
  rookie: 'bg-slate-500/10 border-slate-500/20',
  veteran: 'bg-green-500/10 border-green-500/20',
  elite: 'bg-blue-500/10 border-blue-500/20',
  grandmaster: 'bg-purple-500/10 border-purple-500/20',
};

const TIER_COLORS: Record<string, string> = {
  Starter: 'text-slate-400',
  Easy: 'text-green-400',
  Medium: 'text-amber-400',
  Hard: 'text-orange-400',
  Expert: 'text-red-400',
  Master: 'text-purple-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

interface SpeedRunPanelProps {
  state: GameState;
}

export default function SpeedRunPanel({ state }: SpeedRunPanelProps) {
  const [activeTab, setActiveTab] = useState<SpeedRunTab>('overview');
  const [data, setData] = useState<SpeedRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [bracketFilter, setBracketFilter] = useState<SpeedRunBracket | 'all'>('all');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const prestigeLevel = state.prestige?.level ?? 0;
  const canParticipate = prestigeLevel >= 1;

  // Fetch speed run data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/speed-runs');
      if (!res.ok) throw new Error('Failed to load speed run data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError('Failed to load speed run data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Live timer
  useEffect(() => {
    if (data?.activeAttempt && !data.activeAttempt.isCompleted) {
      const updateTimer = () => {
        const now = Date.now();
        setElapsed(now - data.activeAttempt!.startedAtMs);
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsed(0);
    }
  }, [data?.activeAttempt]);

  // Start speed run
  const handleStartSpeedRun = async () => {
    if (!canParticipate || starting) return;
    setStarting(true);
    try {
      const res = await fetch('/api/space-tycoon/speed-runs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestigeLevel }),
      });
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || 'Failed to start speed run');
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  // Check milestone completion (uses ref to always read latest game state)
  const handleCheckMilestone = useCallback(async () => {
    const s = stateRef.current;
    try {
      const res = await fetch('/api/space-tycoon/speed-runs/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState: {
            money: s.money,
            buildings: s.buildings,
            completedResearch: s.completedResearch,
            activeServices: s.activeServices,
            unlockedLocations: s.unlockedLocations,
            resources: s.resources,
          },
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // Non-critical
    }
  }, [fetchData]);

  // Auto-check milestones periodically when there is an active attempt
  useEffect(() => {
    if (data?.activeAttempt && !data.activeAttempt.isCompleted) {
      const interval = setInterval(handleCheckMilestone, 30000);
      return () => clearInterval(interval);
    }
  }, [data?.activeAttempt, handleCheckMilestone]);

  // Get milestone completion status from local game state
  const getLocalMilestoneStatus = (milestoneId: string): boolean => {
    return checkMilestoneCompletion(state, milestoneId);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-lg w-48" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-cyan-300">
            Speed Runs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Race to milestones after prestige</p>
        </div>
        {canParticipate && data?.activeAttempt && !data.activeAttempt.isCompleted && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 text-sm font-mono font-bold">
              {formatElapsedTime(elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Not eligible banner */}
      {!canParticipate && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-center">
          <span className="text-3xl block mb-2">&#128640;</span>
          <p className="text-amber-300 font-medium text-sm">Speed Runs unlock after your first Prestige</p>
          <p className="text-slate-500 text-xs mt-1">Complete your first playthrough, then prestige to P1 to start competing!</p>
        </div>
      )}

      {/* Sub-Tabs */}
      {canParticipate && (
        <div className="flex gap-1 p-1 rounded-lg bg-white/5">
          {TAB_OPTIONS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Overview Tab */}
      {canParticipate && activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Run / Start Button */}
            <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-cyan-400">&#9201;</span>
                {data?.activeAttempt ? 'Active Run' : 'Start a Run'}
              </h3>

              {data?.activeAttempt ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Prestige Level</span>
                    <span className="text-xs text-white font-medium">P{data.activeAttempt.prestigeLevel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Bracket</span>
                    <span className={`text-xs font-medium ${BRACKET_COLORS[data.activeAttempt.bracket as SpeedRunBracket] || 'text-white'}`}>
                      {data.activeAttempt.bracketName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Elapsed</span>
                    <span className="text-sm text-cyan-300 font-mono font-bold">
                      {data.activeAttempt.isCompleted
                        ? formatElapsedTime((data.activeAttempt.durationSeconds ?? 0) * 1000)
                        : formatElapsedTime(elapsed)
                      }
                    </span>
                  </div>
                  {data.activeAttempt.isCompleted && data.activeAttempt.rank && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Bracket Rank</span>
                      <span className="text-xs text-amber-400 font-bold">#{data.activeAttempt.rank}</span>
                    </div>
                  )}

                  {data.activeAttempt.isCompleted && (
                    <div className="mt-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-center">
                      <span className="text-green-400 text-xs font-medium">Milestone Complete!</span>
                    </div>
                  )}

                  {/* Milestone progress checklist */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Milestones</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {SPEED_RUN_MILESTONES.map(m => {
                        const done = getLocalMilestoneStatus(m.id);
                        return (
                          <div key={m.id} className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] ${
                              done
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-white/5 text-white/20 border border-white/10'
                            }`}>
                              {done ? '\u2713' : ''}
                            </div>
                            <span className={`text-xs ${done ? 'text-white' : 'text-white/40'}`}>
                              {m.name}
                            </span>
                            <span className={`text-[10px] ml-auto ${TIER_COLORS[m.tier] || 'text-slate-500'}`}>
                              {m.tier}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-xs mb-3">
                    Prestige to start a speed run. Race against other players to reach milestones as fast as possible!
                  </p>
                  <button
                    onClick={handleStartSpeedRun}
                    disabled={starting}
                    className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-cyan-600 hover:from-amber-500 hover:to-cyan-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {starting ? 'Starting...' : 'Start Speed Run'}
                  </button>
                  <p className="text-[10px] text-slate-600 mt-2">
                    Your prestige level: P{prestigeLevel} ({getBracketDisplayName(getPrestigeBracket(prestigeLevel))})
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Challenge Card */}
            {data?.currentChallenge && (
              <div className="rounded-xl bg-white/[0.02] border border-amber-500/20 p-4">
                <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                  <span>&#127942;</span>
                  Weekly Challenge
                </h3>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-white text-sm font-medium">{data.currentChallenge.milestoneName}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{data.currentChallenge.milestoneDescription}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Tier</span>
                    <span className={`text-xs font-medium ${TIER_COLORS[data.currentChallenge.milestoneTier] || 'text-white'}`}>
                      {data.currentChallenge.milestoneTier}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Participants</span>
                    <span className="text-xs text-white">{data.currentChallenge.participantCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Time Remaining</span>
                    <span className="text-xs text-cyan-400">{formatElapsedTime(data.currentChallenge.timeRemaining)}</span>
                  </div>

                  {/* Composite milestone */}
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Bonus Challenge</p>
                    <p className="text-xs text-white">{data.currentChallenge.compositeMilestoneName}</p>
                    <p className="text-[10px] text-slate-500">{data.currentChallenge.compositeMilestoneDescription}</p>
                  </div>
                </div>

                {/* Next week preview */}
                {data.nextChallenge && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Coming Next Week</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300">{data.nextChallenge.milestoneName}</span>
                      <span className={`text-[10px] ${TIER_COLORS[data.nextChallenge.milestoneTier] || 'text-slate-500'}`}>
                        {data.nextChallenge.milestoneTier}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      + {data.nextChallenge.compositeMilestoneName}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {canParticipate && activeTab === 'leaderboard' && (
        <div className="space-y-3">
          {/* Bracket Filter Tabs */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setBracketFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                bracketFilter === 'all'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All
            </button>
            {BRACKETS.map(b => (
              <button
                key={b.id}
                onClick={() => setBracketFilter(b.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  bracketFilter === b.id
                    ? `${BRACKET_BG[b.id]} ${BRACKET_COLORS[b.id]} border`
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Leaderboard Table */}
          <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-3 py-2 bg-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
              <span>#</span>
              <span>Company</span>
              <span>Time</span>
              <span className="hidden md:block">Bracket</span>
              <span>P.Lvl</span>
              <span className="hidden md:block">Date</span>
            </div>

            {(!data?.leaderboard || data.leaderboard.length === 0) ? (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-500 text-xs">No completed speed runs yet this week</p>
                <p className="text-slate-600 text-[10px] mt-1">Be the first to set a time!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {data.leaderboard
                  .filter(e => bracketFilter === 'all' || e.bracket === bracketFilter)
                  .map((entry) => (
                    <div
                      key={`${entry.rank}-${entry.companyName}`}
                      className={`grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-3 py-2.5 items-center ${
                        entry.isCurrentPlayer
                          ? 'bg-amber-500/5 border-l-2 border-l-amber-500'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className={`text-xs font-bold w-6 text-right ${
                        entry.rank === 1 ? 'text-amber-400' :
                        entry.rank === 2 ? 'text-slate-300' :
                        entry.rank === 3 ? 'text-amber-700' :
                        'text-slate-500'
                      }`}>
                        {entry.rank <= 3 ? ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'][entry.rank] : `#${entry.rank}`}
                      </span>
                      <div className="min-w-0">
                        <span className={`text-xs truncate block ${entry.isCurrentPlayer ? 'text-amber-300 font-bold' : 'text-white'}`}>
                          {entry.isCurrentPlayer ? '[YOU] ' : ''}{entry.companyName}
                          {entry.allianceTag && (
                            <span className="text-slate-500 ml-1">[{entry.allianceTag}]</span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-cyan-300 font-mono font-medium">
                        {entry.elapsedFormatted}
                      </span>
                      <span className={`text-[10px] hidden md:block ${BRACKET_COLORS[entry.bracket as SpeedRunBracket] || 'text-slate-400'}`}>
                        {entry.bracket.charAt(0).toUpperCase() + entry.bracket.slice(1)}
                      </span>
                      <span className="text-[10px] text-slate-400">P{entry.prestigeLevel}</span>
                      <span className="text-[10px] text-slate-600 hidden md:block">
                        {entry.completedAt ? new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hall of Fame Tab */}
      {canParticipate && activeTab === 'hallOfFame' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.02] border border-amber-500/20 p-4">
            <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <span>&#127942;</span>
              All-Time Records
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fastest times ever recorded for each milestone, per bracket.
            </p>

            <div className="space-y-2">
              {SPEED_RUN_MILESTONES.map(m => (
                <div key={m.id} className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white font-medium">{m.name}</span>
                    <span className={`text-[10px] ${TIER_COLORS[m.tier] || 'text-slate-500'}`}>
                      {m.tier}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">{m.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {BRACKETS.map(b => (
                      <div
                        key={b.id}
                        className={`rounded px-2 py-1 ${BRACKET_BG[b.id]} border`}
                      >
                        <p className={`text-[9px] ${BRACKET_COLORS[b.id]}`}>{b.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">--</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Bests */}
          <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <span>&#9989;</span>
              Your Personal Bests
            </h3>
            {data?.activeAttempt ? (
              <div className="space-y-2">
                <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white">{data.currentChallenge?.milestoneName ?? 'Current Challenge'}</span>
                    {data.activeAttempt.isCompleted && data.activeAttempt.durationSeconds ? (
                      <span className="text-xs text-green-400 font-mono">
                        {formatElapsedTime(data.activeAttempt.durationSeconds * 1000)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">In Progress...</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                Complete a speed run to see your personal bests here.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rewards Legend */}
      {canParticipate && (
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Rank Rewards</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">#1</span>
              <span className="text-slate-400">$500M + 100 LP + &quot;Speed Demon&quot;</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-bold">#2</span>
              <span className="text-slate-400">$350M + 75 LP + &quot;Velocity&quot;</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-700 font-bold">#3</span>
              <span className="text-slate-400">$250M + 50 LP + &quot;Swift&quot;</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold">Top 10</span>
              <span className="text-slate-400">$150M + 30 LP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold">Top 25</span>
              <span className="text-slate-400">$100M + 20 LP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold">Top 50%</span>
              <span className="text-slate-400">$50M + 10 LP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
