'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import {
  TIER_NAMES,
  TIER_THRESHOLDS,
  formatMPP,
  formatNumber,
} from '@/lib/game/mega-projects';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhaseData {
  phase: number;
  name: string;
  moneyCost: number;
  resourceCosts: Record<string, number>;
  progress: Record<string, number>;
  isLocked: boolean;
  isComplete: boolean;
  isCurrent: boolean;
}

interface CurrentPhaseDetail {
  phase: number;
  name: string;
  moneyCost: number;
  moneyContributed: number;
  resourceCosts: Record<string, number>;
  resourceProgress: Record<string, { contributed: number; required: number }>;
}

interface PlayerProgress {
  totalMpp: number;
  totalCash: number;
  totalResources: Record<string, number>;
  tier: number;
  tierName: string;
  tierIcon: string;
  nextTier: number | null;
  nextTierName: string | null;
  nextTierThreshold: number | null;
  progressToNext: number;
  rank: number | null;
  contributionTier: number;
}

interface AllianceEntry {
  rank: number;
  allianceName: string;
  allianceTag: string;
  totalMpp: number;
  memberCount: number;
  perCapitaMpp: number;
}

interface IndividualEntry {
  rank: number;
  companyName: string;
  allianceTag: string | null;
  totalMpp: number;
}

interface ProjectData {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  currentPhase: number;
  totalPhases: number;
  startsAt: string;
  endsAt: string;
  completedAt: string | null;
  completionPct: number;
  totalMoneyFunded: number;
  daysRemaining: number;
  permanentBonus: { type: string; label: string; baseValue: number };
}

interface MegaProjectResponse {
  project: ProjectData | null;
  message?: string;
  phases?: PhaseData[];
  currentPhase?: CurrentPhaseDetail | null;
  playerProgress?: PlayerProgress;
  allianceProgress?: {
    allianceId: string;
    allianceName: string;
    allianceTag: string;
    totalMpp: number;
    rank: number | null;
    perCapitaMpp: number;
  } | null;
  compactLeaderboard?: {
    alliances: AllianceEntry[];
    individuals: IndividualEntry[];
  };
}

type SubTab = 'overview' | 'contribute' | 'leaderboard' | 'progress';

interface MegaProjectPanelProps {
  state: GameState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getResourceName(id: string): string {
  return RESOURCE_MAP.get(id as ResourceId)?.name || id;
}

function getResourceIcon(id: string): string {
  return RESOURCE_MAP.get(id as ResourceId)?.icon || '';
}

function formatCountdownDays(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Deadline passed';
  if (daysRemaining === 1) return '1 day remaining';
  return `${daysRemaining} days remaining`;
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-amber-600';
}

// ─── Countdown Timer Hook ───────────────────────────────────────────────────

function useCountdown(targetDate: string | null): string {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (!targetDate) return;

    function update() {
      const ms = new Date(targetDate!).getTime() - Date.now();
      if (ms <= 0) {
        setTimeStr('Deadline reached');
        return;
      }
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      if (days > 0) {
        setTimeStr(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeStr(`${hours}h ${minutes}m`);
      } else {
        setTimeStr(`${minutes}m`);
      }
    }

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeStr;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MegaProjectPanel({ state }: MegaProjectPanelProps) {
  const [data, setData] = useState<MegaProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('overview');

  // Contribute form state
  const [cashInput, setCashInput] = useState('');
  const [resourceInputs, setResourceInputs] = useState<Record<string, string>>({});
  const [contributing, setContributing] = useState(false);
  const [contributeError, setContributeError] = useState<string | null>(null);
  const [contributeSuccess, setContributeSuccess] = useState<string | null>(null);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<Record<string, unknown> | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'alliance' | 'individual'>('alliance');

  // Fetch project data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/mega-projects');
      if (!res.ok) throw new Error('Failed to load mega-project');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/mega-projects/leaderboard');
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const json = await res.json();
      setLeaderboardData(json);
    } catch {
      // non-critical
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'leaderboard' && !leaderboardData) {
      fetchLeaderboard();
    }
  }, [subTab, leaderboardData, fetchLeaderboard]);

  // Countdown
  const countdown = useCountdown(data?.project?.endsAt || null);

  // Player's available resources for the current phase
  const availableResources = useMemo(() => {
    if (!data?.currentPhase) return {};
    const result: Record<string, number> = {};
    for (const resourceId of Object.keys(data.currentPhase.resourceCosts)) {
      result[resourceId] = (state.resources?.[resourceId]) || 0;
    }
    return result;
  }, [data?.currentPhase, state.resources]);

  // Handle contribution
  const handleContribute = async () => {
    setContributeError(null);
    setContributeSuccess(null);
    setContributing(true);

    try {
      const money = cashInput ? parseFloat(cashInput.replace(/,/g, '')) : 0;
      const resources: Record<string, number> = {};
      for (const [id, val] of Object.entries(resourceInputs)) {
        const qty = parseInt(val, 10);
        if (qty > 0) resources[id] = qty;
      }

      if (money <= 0 && Object.keys(resources).length === 0) {
        setContributeError('Enter money and/or resources to contribute.');
        setContributing(false);
        return;
      }

      const res = await fetch('/api/space-tycoon/mega-projects/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ money, resources }),
      });

      const json = await res.json();

      if (!res.ok) {
        setContributeError(json.error || 'Contribution failed');
        setContributing(false);
        return;
      }

      // Success
      const earned = formatMPP(json.contribution.mppEarned);
      let msg = `Contributed! Earned ${earned} MPP.`;
      if (json.contribution.tierUp) {
        msg += ` Tier up: ${json.contribution.tierName}!`;
      }
      if (json.projectProgress.phaseAdvanced) {
        msg += ` Phase ${json.projectProgress.newPhase} unlocked!`;
      }
      if (json.projectProgress.projectCompleted) {
        msg = 'PROJECT COMPLETED! The galaxy built this together!';
      }
      setContributeSuccess(msg);

      // Clear inputs
      setCashInput('');
      setResourceInputs({});

      // Refresh data
      await fetchData();
    } catch (err) {
      setContributeError(String(err));
    } finally {
      setContributing(false);
    }
  };

  // Set resource input to max
  const setResourceMax = (resourceId: string) => {
    const max = availableResources[resourceId] || 0;
    setResourceInputs(prev => ({ ...prev, [resourceId]: String(max) }));
  };

  // Set cash to max (10% of balance)
  const setCashMax = () => {
    const max = Math.floor(state.money * 0.10);
    setCashInput(max.toLocaleString('en-US'));
  };

  // ─── Loading / Error / No Project ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-white/[0.03] rounded-xl animate-pulse" />
        <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" />
        <div className="h-24 bg-white/[0.03] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 text-sm">Failed to load mega-project: {error}</p>
        <button onClick={fetchData} className="mt-2 text-xs text-red-300 underline">Retry</button>
      </div>
    );
  }

  if (!data?.project) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-8 text-center">
        <p className="text-4xl mb-3">🚀</p>
        <p className="text-white font-semibold text-lg">No Active Mega-Project</p>
        <p className="text-slate-400 text-sm mt-2">
          {data?.message || 'Check back soon -- the next galaxy-wide construction project will be announced.'}
        </p>
      </div>
    );
  }

  const project = data.project;
  const phases = data.phases || [];
  const currentPhase = data.currentPhase || null;
  const player = data.playerProgress || {
    totalMpp: 0, totalCash: 0, totalResources: {}, tier: 0, tierName: 'Observer',
    tierIcon: '', nextTier: 1, nextTierName: 'Supporter', nextTierThreshold: 100_000,
    progressToNext: 0, rank: null, contributionTier: 0,
  };
  const alliance = data.allianceProgress || null;
  const compact = data.compactLeaderboard || { alliances: [], individuals: [] };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Project Banner ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/50 to-purple-500/10 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Mega-Project
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Phase {project.currentPhase} of {project.totalPhases}
              </span>
              {project.status === 'extended' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  Extended
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-100">
              {project.title}
            </h2>
            <p className="text-slate-400 text-xs mt-1 max-w-lg">{project.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-amber-300 text-sm font-mono">{countdown}</p>
            <p className="text-slate-500 text-xs">{formatCountdownDays(project.daysRemaining)}</p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-white text-sm font-semibold">
              {project.completionPct.toFixed(1)}% Complete
            </span>
            <span className="text-slate-400 text-xs">
              {formatMoney(project.totalMoneyFunded)} funded
            </span>
          </div>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressBarColor(project.completionPct)} shadow-lg`}
              style={{ width: `${Math.min(100, project.completionPct)}%` }}
            />
          </div>
        </div>

        {/* Phase Segments */}
        <div className="mt-3 flex gap-1">
          {phases.map((phase) => {
            const pct = phase.isComplete ? 100 : phase.isLocked ? 0 : (() => {
              const prog = phase.progress;
              const costs = phase.resourceCosts;
              const ratios: number[] = [];
              ratios.push(Math.min(1, (prog['cash'] || 0) / phase.moneyCost));
              for (const [id, req] of Object.entries(costs)) {
                ratios.push(Math.min(1, (prog[id] || 0) / (req || 1)));
              }
              return ratios.length > 0 ? (ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100 : 0;
            })();
            return (
              <div key={phase.phase} className="flex-1">
                <div className="text-[10px] text-center text-slate-500 mb-0.5">
                  P{phase.phase} {phase.isComplete ? '(Done)' : phase.isLocked ? '(Locked)' : ''}
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      phase.isComplete ? 'bg-green-500' :
                      phase.isLocked ? 'bg-slate-700' :
                      'bg-amber-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {player.rank && (
            <span>Your rank: <span className="text-amber-300 font-medium">#{player.rank}</span></span>
          )}
          <span>Tier: <span className="text-amber-300 font-medium">{player.tierName}</span></span>
          <span>MPP: <span className="text-amber-300 font-medium">{formatMPP(player.totalMpp)}</span></span>
        </div>
      </div>

      {/* ── Sub-Tab Navigation ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { id: 'overview' as SubTab, label: 'Overview', icon: '📊' },
          { id: 'contribute' as SubTab, label: 'Contribute', icon: '🔨' },
          { id: 'leaderboard' as SubTab, label: 'Leaderboard', icon: '🏆' },
          { id: 'progress' as SubTab, label: 'My Progress', icon: '📈' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === tab.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Sub-Tab Content ────────────────────────────────────────────────── */}

      {/* OVERVIEW */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          {/* Current Phase Detail */}
          {currentPhase && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-white font-semibold text-sm mb-3">
                Phase {currentPhase.phase}: {currentPhase.name}
              </h3>

              {/* Cash Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Cash</span>
                  <span className="text-white font-mono">
                    {formatMoney(currentPhase.moneyContributed)} / {formatMoney(currentPhase.moneyCost)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentPhase.moneyContributed / currentPhase.moneyCost) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Resource Progress */}
              {Object.entries(currentPhase.resourceProgress).map(([id, { contributed, required }]) => {
                const pct = Math.min(100, (contributed / required) * 100);
                return (
                  <div key={id} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">
                        {getResourceIcon(id)} {getResourceName(id)}
                      </span>
                      <span className="text-white font-mono">
                        {formatNumber(contributed)} / {formatNumber(required)}
                        <span className="text-slate-500 ml-1">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressBarColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All Phases Overview */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Phase Map</h3>
            <div className="space-y-2">
              {phases.map(phase => (
                <div
                  key={phase.phase}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    phase.isCurrent ? 'bg-amber-500/10 border border-amber-500/20' :
                    phase.isComplete ? 'bg-green-500/5 border border-green-500/10' :
                    'bg-white/[0.02] border border-white/[0.04]'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    phase.isComplete ? 'bg-green-500 text-white' :
                    phase.isCurrent ? 'bg-amber-500 text-black' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {phase.isComplete ? '✓' : phase.phase}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${
                      phase.isCurrent ? 'text-amber-300' :
                      phase.isComplete ? 'text-green-400' :
                      'text-slate-500'
                    }`}>
                      {phase.name}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {formatMoney(phase.moneyCost)} + {Object.entries(phase.resourceCosts).map(([id, q]) =>
                        `${formatNumber(q || 0)} ${getResourceName(id)}`
                      ).join(', ')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    phase.isComplete ? 'bg-green-500/20 text-green-400' :
                    phase.isCurrent ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-700/50 text-slate-500'
                  }`}>
                    {phase.isComplete ? 'Complete' : phase.isCurrent ? 'Active' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Permanent Bonus Preview */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <h3 className="text-purple-300 font-semibold text-sm mb-1">Completion Reward</h3>
            <p className="text-white text-sm">{project.permanentBonus.label}</p>
            <p className="text-slate-400 text-xs mt-1">
              This bonus is permanent and benefits ALL players in the galaxy, forever.
            </p>
          </div>

          {/* Compact Leaderboards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Alliance Top 5 */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <h4 className="text-slate-300 text-xs font-semibold mb-2">Top Alliances</h4>
              {compact.alliances.length === 0 ? (
                <p className="text-slate-600 text-xs">No alliance contributions yet.</p>
              ) : (
                <div className="space-y-1">
                  {compact.alliances.map(a => (
                    <div key={a.rank} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        <span className={`font-bold ${a.rank <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                          #{a.rank}
                        </span>{' '}
                        <span className="text-slate-500">[{a.allianceTag}]</span>{' '}
                        <span className="text-white">{a.allianceName}</span>
                      </span>
                      <span className="text-amber-300 font-mono">{formatMPP(a.totalMpp)}</span>
                    </div>
                  ))}
                </div>
              )}
              {alliance && (
                <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs">
                  <span className="text-slate-400">Your alliance: </span>
                  <span className="text-amber-300 font-medium">
                    #{alliance.rank || '?'} {alliance.allianceName}
                  </span>
                </div>
              )}
            </div>

            {/* Individual Top 10 */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <h4 className="text-slate-300 text-xs font-semibold mb-2">Top Contributors</h4>
              {compact.individuals.length === 0 ? (
                <p className="text-slate-600 text-xs">No contributions yet.</p>
              ) : (
                <div className="space-y-1">
                  {compact.individuals.slice(0, 10).map(ind => (
                    <div key={ind.rank} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate mr-2">
                        <span className={`font-bold ${ind.rank <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                          #{ind.rank}
                        </span>{' '}
                        <span className="text-white">{ind.companyName}</span>
                        {ind.allianceTag && (
                          <span className="text-slate-600 ml-1">[{ind.allianceTag}]</span>
                        )}
                      </span>
                      <span className="text-amber-300 font-mono shrink-0">{formatMPP(ind.totalMpp)}</span>
                    </div>
                  ))}
                </div>
              )}
              {player.rank && (
                <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs">
                  <span className="text-slate-400">Your rank: </span>
                  <span className="text-amber-300 font-medium">#{player.rank}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTRIBUTE */}
      {subTab === 'contribute' && currentPhase && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-amber-300 font-semibold text-sm mb-1">
              Contribute to Phase {currentPhase.phase}: {currentPhase.name}
            </h3>
            <p className="text-slate-400 text-xs">
              Resources and cash are permanently consumed. You earn Mega-Project Points (MPP)
              for every contribution. Resources get a 1.5x MPP bonus.
            </p>
          </div>

          {/* Cash Contribution */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-white text-sm font-medium mb-2">Cash Contribution</h4>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-slate-400 text-xs block mb-1">Amount ($)</label>
                <input
                  type="text"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value.replace(/[^0-9,]/g, ''))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/[0.08] text-white text-sm font-mono focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <button
                onClick={setCashMax}
                className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors"
              >
                Max (10%)
              </button>
            </div>
            <p className="text-slate-600 text-[10px] mt-1">
              Balance: {formatMoney(state.money)} | Max per tx: {formatMoney(Math.floor(state.money * 0.10))} | Min: $1M
            </p>
          </div>

          {/* Resource Contributions */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-white text-sm font-medium mb-3">Resource Contributions</h4>
            <div className="space-y-3">
              {Object.entries(currentPhase.resourceCosts).map(([id, required]) => {
                const available = availableResources[id] || 0;
                const contributed = currentPhase.resourceProgress[id]?.contributed || 0;
                const remaining = Math.max(0, required - contributed);
                return (
                  <div key={id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        {getResourceIcon(id)} {getResourceName(id)}
                      </span>
                      <span className="text-slate-500">
                        You have: <span className="text-white">{formatNumber(available)}</span>
                        {' | '}
                        Still needed: <span className="text-amber-300">{formatNumber(remaining)}</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        max={available}
                        value={resourceInputs[id] || ''}
                        onChange={(e) => setResourceInputs(prev => ({ ...prev, [id]: e.target.value }))}
                        placeholder="0"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/[0.08] text-white text-sm font-mono focus:border-amber-500/50 focus:outline-none"
                      />
                      <button
                        onClick={() => setResourceMax(id)}
                        className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium hover:bg-amber-500/20 transition-colors"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MPP Preview */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <MppPreview
              cashInput={cashInput}
              resourceInputs={resourceInputs}
              playerTotalMpp={player.totalMpp}
            />
          </div>

          {/* Errors & Success */}
          {contributeError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-red-300 text-xs">
              {contributeError}
            </div>
          )}
          {contributeSuccess && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-green-300 text-xs">
              {contributeSuccess}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleContribute}
            disabled={contributing}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              contributing
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/20'
            }`}
          >
            {contributing ? 'Contributing...' : 'Contribute to Mega-Project'}
          </button>
        </div>
      )}

      {subTab === 'contribute' && !currentPhase && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 text-center">
          <p className="text-slate-400 text-sm">No active phase to contribute to.</p>
        </div>
      )}

      {/* LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setLeaderboardTab('alliance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                leaderboardTab === 'alliance'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/[0.04] text-slate-400 border border-transparent'
              }`}
            >
              Alliance Rankings
            </button>
            <button
              onClick={() => setLeaderboardTab('individual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                leaderboardTab === 'individual'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/[0.04] text-slate-400 border border-transparent'
              }`}
            >
              Individual Rankings
            </button>
            <button
              onClick={fetchLeaderboard}
              disabled={leaderboardLoading}
              className="ml-auto px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white"
            >
              {leaderboardLoading ? '...' : 'Refresh'}
            </button>
          </div>

          {leaderboardLoading && !leaderboardData && (
            <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" />
          )}

          {leaderboardData && leaderboardTab === 'alliance' && (
            <LeaderboardAlliances data={leaderboardData} />
          )}

          {leaderboardData && leaderboardTab === 'individual' && (
            <LeaderboardIndividuals data={leaderboardData} />
          )}
        </div>
      )}

      {/* MY PROGRESS */}
      {subTab === 'progress' && (
        <div className="space-y-4">
          {/* Tier Card */}
          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-slate-900/50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg">
                {player.tier === 0 ? '👁' :
                 player.tier === 1 ? '🔧' :
                 player.tier === 2 ? '🔧' :
                 player.tier === 3 ? '🔧' :
                 player.tier === 4 ? '🔧' :
                 player.tier === 5 ? '💎' :
                 player.tier === 6 ? '💠' :
                 '⭐'}
              </div>
              <div>
                <p className="text-amber-300 font-bold text-lg">{player.tierName}</p>
                <p className="text-slate-400 text-xs">Tier {player.tier} of 7</p>
              </div>
            </div>

            {/* Progress to next tier */}
            {player.nextTier !== null && player.nextTierThreshold !== null && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">
                    Progress to {player.nextTierName}
                  </span>
                  <span className="text-amber-300 font-mono">
                    {(player.progressToNext * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${player.progressToNext * 100}%` }}
                  />
                </div>
                <p className="text-slate-600 text-[10px] mt-1 text-right">
                  {formatMPP(player.totalMpp)} / {formatMPP(player.nextTierThreshold)} MPP
                </p>
              </div>
            )}
            {player.nextTier === null && (
              <p className="text-amber-400 text-xs font-medium">Maximum tier reached!</p>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-white text-sm font-semibold mb-3">Your Contribution Summary</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Total MPP</p>
                <p className="text-white font-bold text-lg">{formatMPP(player.totalMpp)}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Rank</p>
                <p className="text-white font-bold text-lg">
                  {player.rank ? `#${player.rank}` : '--'}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Cash Given</p>
                <p className="text-white font-bold text-sm">{formatMoney(player.totalCash)}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Tier</p>
                <p className="text-amber-300 font-bold text-sm">{player.tierName}</p>
              </div>
            </div>
          </div>

          {/* Resource Breakdown */}
          {Object.keys(player.totalResources || {}).length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h4 className="text-white text-sm font-semibold mb-2">Resources Contributed</h4>
              <div className="space-y-1">
                {Object.entries(player.totalResources || {}).map(([id, qty]) => {
                  if (typeof qty !== 'number' || qty <= 0) return null;
                  return (
                    <div key={id} className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        {getResourceIcon(id)} {getResourceName(id)}
                      </span>
                      <span className="text-white font-mono">{formatNumber(qty)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tier Roadmap */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="text-white text-sm font-semibold mb-3">Tier Roadmap</h4>
            <div className="space-y-2">
              {TIER_NAMES.map((name, i) => {
                const reached = i <= player.tier;
                const isCurrent = i === player.tier;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      isCurrent ? 'bg-amber-500/10 border border-amber-500/20' :
                      reached ? 'bg-green-500/5 border border-green-500/10' :
                      'bg-white/[0.01] border border-white/[0.04]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      reached ? 'bg-green-500 text-white' :
                      'bg-slate-700 text-slate-500'
                    }`}>
                      {reached ? '✓' : i}
                    </span>
                    <span className={`flex-1 ${isCurrent ? 'text-amber-300 font-medium' : reached ? 'text-green-400' : 'text-slate-500'}`}>
                      {name}
                    </span>
                    <span className="text-slate-600 font-mono">
                      {i === 0 ? '--' : `${formatMPP(TIER_THRESHOLDS[i])} MPP`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function MppPreview({
  cashInput,
  resourceInputs,
  playerTotalMpp,
}: {
  cashInput: string;
  resourceInputs: Record<string, string>;
  playerTotalMpp: number;
}) {
  const estimate = useMemo(() => {
    let mpp = 0;
    const cash = parseFloat(cashInput.replace(/,/g, '')) || 0;
    if (cash > 0) mpp += cash * 1.0; // cash multiplier

    for (const [id, val] of Object.entries(resourceInputs)) {
      const qty = parseInt(val, 10) || 0;
      if (qty <= 0) continue;
      const resource = RESOURCE_MAP.get(id as ResourceId);
      if (!resource) continue;
      mpp += qty * resource.baseMarketPrice * 1.5; // resource multiplier
    }

    return mpp;
  }, [cashInput, resourceInputs]);

  if (estimate <= 0) {
    return <p className="text-slate-500 text-xs">Enter amounts above to see MPP estimate.</p>;
  }

  const newTotal = playerTotalMpp + estimate;
  const newTier = (() => {
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
      if (newTotal >= TIER_THRESHOLDS[i]) return i;
    }
    return 0;
  })();
  const currentTier = (() => {
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
      if (playerTotalMpp >= TIER_THRESHOLDS[i]) return i;
    }
    return 0;
  })();
  const tierUp = newTier > currentTier;

  return (
    <div className="text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-slate-400">MPP earned from this contribution:</span>
        <span className="text-amber-300 font-bold font-mono">{formatMPP(estimate)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Your new total:</span>
        <span className="text-white font-mono">{formatMPP(newTotal)}</span>
      </div>
      {tierUp && (
        <div className="text-green-400 font-medium pt-1">
          Tier up! You will reach {TIER_NAMES[newTier]} (Tier {newTier})
        </div>
      )}
    </div>
  );
}

function LeaderboardAlliances({ data }: { data: Record<string, unknown> }) {
  const alliances = data.alliances as {
    byTotal: AllianceEntry[];
    playerAlliance: { totalRank: number | null; perCapitaRank: number | null; totalMpp: number; perCapitaMpp: number } | null;
    total: number;
  } | undefined;

  if (!alliances) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/[0.03]">
            <th className="text-left text-slate-500 font-medium py-2 px-3 w-10">#</th>
            <th className="text-left text-slate-500 font-medium py-2 px-3">Alliance</th>
            <th className="text-right text-slate-500 font-medium py-2 px-3">Total MPP</th>
            <th className="text-right text-slate-500 font-medium py-2 px-3 hidden sm:table-cell">Per Capita</th>
          </tr>
        </thead>
        <tbody>
          {alliances.byTotal.map((entry) => (
            <tr key={entry.rank} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
              <td className="py-2 px-3">
                <span className={`font-bold ${
                  entry.rank === 1 ? 'text-amber-400' :
                  entry.rank === 2 ? 'text-slate-300' :
                  entry.rank === 3 ? 'text-amber-600' :
                  'text-slate-500'
                }`}>
                  {entry.rank}
                </span>
              </td>
              <td className="py-2 px-3">
                <span className="text-slate-500">[{entry.allianceTag}]</span>{' '}
                <span className="text-white">{entry.allianceName}</span>
                <span className="text-slate-600 ml-1 text-[10px]">{entry.memberCount}m</span>
              </td>
              <td className="py-2 px-3 text-right">
                <span className="text-amber-300 font-mono">{formatMPP(entry.totalMpp)}</span>
              </td>
              <td className="py-2 px-3 text-right hidden sm:table-cell">
                <span className="text-slate-400 font-mono">{formatMPP(entry.perCapitaMpp)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alliances.playerAlliance && (
        <div className="bg-amber-500/5 border-t border-amber-500/20 px-3 py-2 text-xs">
          <span className="text-slate-400">Your alliance: </span>
          <span className="text-amber-300 font-medium">
            Rank #{alliances.playerAlliance.totalRank}
          </span>
          <span className="text-slate-500 ml-2">
            ({formatMPP(alliances.playerAlliance.totalMpp)} MPP)
          </span>
        </div>
      )}
      <div className="bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-600 text-center">
        {alliances.total} alliances contributing
      </div>
    </div>
  );
}

function LeaderboardIndividuals({ data }: { data: Record<string, unknown> }) {
  const individuals = data.individuals as {
    entries: (IndividualEntry & { isYou: boolean })[];
    playerRank: number | null;
    playerMpp: number;
    total: number;
  } | undefined;

  if (!individuals) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/[0.03]">
            <th className="text-left text-slate-500 font-medium py-2 px-3 w-10">#</th>
            <th className="text-left text-slate-500 font-medium py-2 px-3">Company</th>
            <th className="text-right text-slate-500 font-medium py-2 px-3">Total MPP</th>
          </tr>
        </thead>
        <tbody>
          {individuals.entries.map((entry) => (
            <tr
              key={entry.rank}
              className={`border-t border-white/[0.04] ${
                entry.isYou
                  ? 'bg-amber-500/5 hover:bg-amber-500/10'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              <td className="py-2 px-3">
                <span className={`font-bold ${
                  entry.rank === 1 ? 'text-amber-400' :
                  entry.rank === 2 ? 'text-slate-300' :
                  entry.rank === 3 ? 'text-amber-600' :
                  'text-slate-500'
                }`}>
                  {entry.rank}
                </span>
              </td>
              <td className="py-2 px-3">
                <span className={`font-medium ${entry.isYou ? 'text-amber-300' : 'text-white'}`}>
                  {entry.companyName}
                </span>
                {entry.allianceTag && (
                  <span className="text-slate-600 ml-1">[{entry.allianceTag}]</span>
                )}
                {entry.isYou && (
                  <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    YOU
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-right">
                <span className={`font-mono ${entry.isYou ? 'text-amber-300' : 'text-amber-300'}`}>
                  {formatMPP(entry.totalMpp)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {individuals.playerRank && !individuals.entries.some(e => e.isYou) && (
        <div className="bg-amber-500/5 border-t border-amber-500/20 px-3 py-2 text-xs">
          <span className="text-slate-400">Your rank: </span>
          <span className="text-amber-300 font-medium">#{individuals.playerRank}</span>
          <span className="text-slate-500 ml-2">({formatMPP(individuals.playerMpp)} MPP)</span>
        </div>
      )}
      <div className="bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-600 text-center">
        {individuals.total} contributors total
      </div>
    </div>
  );
}
