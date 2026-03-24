'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/game/formulas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RivalComparison {
  netWorthDiffPct: number;
  buildingDiffPct: number;
  researchDiffPct: number;
  serviceDiffPct: number;
  locationsDiffPct: number;
}

interface RivalData {
  companyName: string;
  netWorth: number;
  buildingCount: number;
  serviceCount: number;
  researchCount: number;
  locationsCount: number;
  growthPct: number;
}

interface RivalEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
}

interface RivalAssignment {
  assignmentId: string;
  weekId: number;
  status: string;
  score: number;
  scoreLabel: string;
  scoreColor: string;
  rival: RivalData;
  player: RivalData;
  comparison: RivalComparison;
  trend: number[];
  recentEvents: RivalEvent[];
  createdAt: string;
}

interface RivalsSummary {
  currentStreak: number;
  streakTitle: string | null;
  allTimeRecord: { wins: number; losses: number; draws: number };
  weekTimeRemainingMs: number;
  weekId: number;
}

interface HistoryWeek {
  weekId: number;
  rivals: {
    companyName: string;
    finalScore: number;
    result: string;
  }[];
}

interface RivalsResponse {
  rivals: RivalAssignment[];
  summary: RivalsSummary;
  history: HistoryWeek[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreBarColor(score: number): string {
  if (score >= 85) return 'from-green-500 to-green-400';
  if (score >= 65) return 'from-cyan-500 to-cyan-400';
  if (score >= 51) return 'from-cyan-500/70 to-cyan-400/70';
  if (score >= 36) return 'from-yellow-500/70 to-yellow-400/70';
  if (score >= 16) return 'from-orange-500 to-orange-400';
  return 'from-red-500 to-red-400';
}

function getScoreLabelColor(score: number): string {
  if (score >= 65) return 'text-cyan-300';
  if (score >= 51) return 'text-cyan-400/80';
  if (score === 50) return 'text-slate-300';
  if (score >= 36) return 'text-yellow-400/80';
  if (score >= 16) return 'text-orange-400';
  return 'text-red-400';
}

function getDiffColor(pct: number): string {
  if (pct > 5) return 'text-green-400';
  if (pct < -5) return 'text-red-400';
  return 'text-slate-400';
}

function getDiffArrow(pct: number): string {
  if (pct > 0) return '\u25B2';
  if (pct < 0) return '\u25BC';
  return '\u2500';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Rotating now...';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function trendChar(t: number): { char: string; color: string } {
  if (t > 0) return { char: '\u25B2', color: 'text-green-400' };
  if (t < 0) return { char: '\u25BC', color: 'text-red-400' };
  return { char: '\u2500', color: 'text-slate-600' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RivalsPanel() {
  const [data, setData] = useState<RivalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const fetchRivals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/space-tycoon/rivals');
      if (!res.ok) throw new Error('Failed to load rivals');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rivals');
    } finally {
      setLoading(false);
    }
  }, []);

  const assignRivals = useCallback(async () => {
    try {
      setAssigning(true);
      const res = await fetch('/api/space-tycoon/rivals/assign', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to assign rivals');
      // Refresh data after assignment
      await fetchRivals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign rivals');
    } finally {
      setAssigning(false);
    }
  }, [fetchRivals]);

  useEffect(() => {
    fetchRivals();
  }, [fetchRivals]);

  // Auto-assign on first load if no rivals
  useEffect(() => {
    if (data && data.rivals.length === 0 && !assigning) {
      assignRivals();
    }
  }, [data, assigning, assignRivals]);

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/[0.06] rounded w-48" />
            <div className="h-4 bg-white/[0.04] rounded w-64" />
            <div className="h-32 bg-white/[0.04] rounded" />
            <div className="h-32 bg-white/[0.04] rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchRivals}
          className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { rivals, summary, history } = data;

  // ─── No rivals state ───────────────────────────────────────────────────
  if (rivals.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-8 text-center">
          <div className="text-4xl mb-3">{'\u2694\uFE0F'}</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No Rivals Yet
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Keep growing your company to get matched with shadow rivals.
            Rivals are assigned based on your Composite Power Score.
          </p>
          <button
            onClick={assignRivals}
            disabled={assigning}
            className="px-5 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          >
            {assigning ? 'Searching...' : 'Find Rivals'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main panel ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
              Shadow Rivals
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {rivals.length} rival{rivals.length !== 1 ? 's' : ''} assigned
              {' \u00B7 '}Refreshes in {formatCountdown(summary.weekTimeRemainingMs)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Week {summary.weekId}
            </p>
          </div>
        </div>
      </div>

      {/* Rival Cards */}
      {rivals.map((rival, index) => (
        <RivalCard key={rival.assignmentId} rival={rival} index={index} />
      ))}

      {/* Weekly Summary */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Weekly Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Streak
            </p>
            <p className="text-lg font-bold text-cyan-300">
              {summary.currentStreak}W
            </p>
            {summary.streakTitle && (
              <p className="text-[10px] text-indigo-400 mt-0.5">
                {summary.streakTitle}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Wins
            </p>
            <p className="text-lg font-bold text-green-400">
              {summary.allTimeRecord.wins}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Losses
            </p>
            <p className="text-lg font-bold text-red-400">
              {summary.allTimeRecord.losses}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Draws
            </p>
            <p className="text-lg font-bold text-slate-400">
              {summary.allTimeRecord.draws}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Events Feed */}
      {rivals.some((r) => r.recentEvents.length > 0) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Recent Events
          </h3>
          <div className="space-y-2">
            {rivals
              .flatMap((r) => r.recentEvents)
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice(0, 8)
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 text-xs"
                >
                  <span
                    className={
                      event.type === 'rival_overtaken'
                        ? 'text-green-400'
                        : event.type === 'rival_passed_you'
                          ? 'text-red-400'
                          : event.type === 'rival_assigned'
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                    }
                  >
                    {event.type === 'rival_overtaken'
                      ? '\u25B2'
                      : event.type === 'rival_passed_you'
                        ? '\u25BC'
                        : event.type === 'rival_assigned'
                          ? '\u25C6'
                          : '\u25CF'}
                  </span>
                  <span className="text-slate-300 flex-1">
                    {event.description}
                  </span>
                  <span className="text-slate-600 whitespace-nowrap">
                    {formatTimeAgo(event.createdAt)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Last Week
          </h3>
          <div className="space-y-2">
            {history[0].rivals.map((hr, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-slate-300">{hr.companyName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">
                    {hr.finalScore}/100
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hr.result === 'win'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : hr.result === 'loss'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    {hr.result.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-slate-600 text-[10px] text-center">
        Shadow rivals are asynchronous pairings. Your rivals don&apos;t know
        they&apos;re being watched. Scores update every 4 hours.
      </p>
    </div>
  );
}

// ─── Rival Card Sub-Component ───────────────────────────────────────────────

function RivalCard({
  rival,
  index,
}: {
  rival: RivalAssignment;
  index: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Card Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 font-mono">
              #{index + 1}
            </span>
            <span className="text-sm font-semibold text-white">
              {'\u25C6'} {rival.rival.companyName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">
              {formatMoney(rival.rival.netWorth)}
            </span>
            <span
              className={
                rival.rival.growthPct > 0
                  ? 'text-green-400'
                  : rival.rival.growthPct < 0
                    ? 'text-red-400'
                    : 'text-slate-500'
              }
            >
              {rival.rival.growthPct > 0 ? '+' : ''}
              {rival.rival.growthPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Rivalry Score Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
              {/* Score fill */}
              <div
                className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                  rival.score,
                )} transition-all duration-500`}
                style={{ width: `${rival.score}%` }}
              />
              {/* Center marker */}
              <div className="absolute top-0 left-1/2 h-full w-px bg-white/20" />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-[120px] justify-end">
            <span className="text-xs font-mono text-white">
              {rival.score}/100
            </span>
            <span
              className={`text-[10px] ${getScoreLabelColor(rival.score)}`}
            >
              {rival.scoreLabel}
            </span>
          </div>
        </div>

        {/* Trend indicators */}
        {rival.trend.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-slate-600 mr-1">Trend:</span>
            {rival.trend.map((t, i) => {
              const { char, color } = trendChar(t);
              return (
                <span key={i} className={`text-[10px] ${color}`}>
                  {char}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Metrics Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCompare
            label="Buildings"
            playerVal={rival.player.buildingCount}
            rivalVal={rival.rival.buildingCount}
            diffPct={rival.comparison.buildingDiffPct}
          />
          <MetricCompare
            label="Services"
            playerVal={rival.player.serviceCount}
            rivalVal={rival.rival.serviceCount}
            diffPct={rival.comparison.serviceDiffPct}
          />
          <MetricCompare
            label="Research"
            playerVal={rival.player.researchCount}
            rivalVal={rival.rival.researchCount}
            diffPct={rival.comparison.researchDiffPct}
          />
          <MetricCompare
            label="Locations"
            playerVal={rival.player.locationsCount}
            rivalVal={rival.rival.locationsCount}
            diffPct={rival.comparison.locationsDiffPct}
          />
        </div>

        {/* Net Worth Comparison Row */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span className="text-slate-500">You:</span>{' '}
            <span className="text-white font-mono">
              {formatMoney(rival.player.netWorth)}
            </span>
            {rival.player.growthPct !== 0 && (
              <span
                className={
                  rival.player.growthPct > 0
                    ? 'text-green-400 ml-1'
                    : 'text-red-400 ml-1'
                }
              >
                ({rival.player.growthPct > 0 ? '+' : ''}
                {rival.player.growthPct.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">Them:</span>{' '}
            <span className="text-white font-mono">
              {formatMoney(rival.rival.netWorth)}
            </span>
            {rival.rival.growthPct !== 0 && (
              <span
                className={
                  rival.rival.growthPct > 0
                    ? 'text-green-400 ml-1'
                    : 'text-red-400 ml-1'
                }
              >
                ({rival.rival.growthPct > 0 ? '+' : ''}
                {rival.rival.growthPct.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Comparison Sub-Component ────────────────────────────────────────

function MetricCompare({
  label,
  playerVal,
  rivalVal,
  diffPct,
}: {
  label: string;
  playerVal: number;
  rivalVal: number;
  diffPct: number;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2 text-center">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-center justify-center gap-1.5 text-xs">
        <span className="text-cyan-300 font-mono">{playerVal}</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 font-mono">{rivalVal}</span>
      </div>
      <p className={`text-[10px] mt-0.5 ${getDiffColor(diffPct)}`}>
        {diffPct > 0 ? '+' : ''}
        {diffPct.toFixed(0)}% {getDiffArrow(diffPct)}
      </p>
    </div>
  );
}

// ─── Time Formatting ────────────────────────────────────────────────────────

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
