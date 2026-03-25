'use client';

import { useState } from 'react';
import type { GameState, GameReport } from '@/lib/game/types';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getReportIcon(type: GameReport['type']): string {
  switch (type) {
    case 'probe_discovery': return '🛰️';
    case 'system_alert': return '⚠️';
    case 'milestone': return '🏆';
  }
}

function getReportAccent(type: GameReport['type']): string {
  switch (type) {
    case 'probe_discovery': return '#22d3ee'; // cyan
    case 'system_alert': return '#f59e0b'; // amber
    case 'milestone': return '#a78bfa'; // purple
  }
}

function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatRewardMoney(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ReportsPanelProps {
  state: GameState;
  onMarkRead: (reportId: string) => void;
  onMarkAllRead: () => void;
}

export default function ReportsPanel({ state, onMarkRead, onMarkAllRead }: ReportsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const reports = [...(state.reports || [])].reverse(); // newest first
  const filteredReports = filter === 'unread' ? reports.filter(r => !r.read) : reports;
  const unreadCount = reports.filter(r => !r.read).length;

  const handleExpand = (report: GameReport) => {
    if (expandedId === report.id) {
      setExpandedId(null);
    } else {
      setExpandedId(report.id);
      if (!report.read) {
        onMarkRead(report.id);
      }
    }
  };

  if (reports.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📬</div>
          <h3 className="text-lg font-semibold text-white mb-1">No Reports Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Send survey probes to explore locations. When they complete their expeditions, detailed discovery reports will appear here with rewards and recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Reports & Mail</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/[0.06]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-2 py-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Reports list */}
      {filteredReports.length === 0 && filter === 'unread' && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">All reports have been read.</p>
        </div>
      )}

      <div className="space-y-2">
        {filteredReports.map(report => {
          const isExpanded = expandedId === report.id;
          const accent = getReportAccent(report.type);
          const locName = report.locationId ? LOCATION_MAP.get(report.locationId)?.name : null;

          return (
            <div
              key={report.id}
              className="rounded-lg transition-all cursor-pointer"
              style={{
                background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${!report.read ? accent + '40' : 'rgba(255,255,255,0.06)'}`,
              }}
              onClick={() => handleExpand(report)}
            >
              {/* Report header */}
              <div className="flex items-start gap-3 px-3 py-2.5">
                {/* Unread indicator + icon */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <span className="text-lg">{getReportIcon(report.type)}</span>
                  {!report.read && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                    />
                  )}
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-xs font-semibold truncate"
                      style={{ color: !report.read ? '#fff' : 'rgba(255,255,255,0.6)' }}
                    >
                      {report.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {locName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
                        {locName}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {formatTimeAgo(report.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Rewards summary (collapsed) */}
                {!isExpanded && report.rewards && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {report.rewards.money && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {formatRewardMoney(report.rewards.money)}
                      </span>
                    )}
                    {report.rewards.miningBonus && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Mining Bonus
                      </span>
                    )}
                  </div>
                )}

                {/* Expand chevron */}
                <svg
                  className={`w-4 h-4 transition-transform flex-shrink-0 mt-0.5 ${isExpanded ? 'rotate-180' : ''}`}
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-white/[0.04]">
                  {/* Report body text */}
                  <pre
                    className="text-xs leading-relaxed mt-2 whitespace-pre-wrap font-sans"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                  >
                    {report.body}
                  </pre>

                  {/* Rewards breakdown */}
                  {report.rewards && (
                    <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Rewards Received</p>
                      <div className="flex flex-wrap gap-2">
                        {report.rewards.money && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            💰 {formatRewardMoney(report.rewards.money)}
                          </span>
                        )}
                        {report.rewards.resources && Object.entries(report.rewards.resources).map(([resId, qty]) => {
                          const res = RESOURCE_MAP.get(resId as ResourceId);
                          return (
                            <span
                              key={resId}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            >
                              {res?.icon || '📦'} {qty} {res?.name || resId}
                            </span>
                          );
                        })}
                        {report.rewards.miningBonus && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⛏️ +{report.rewards.miningBonus.bonusPct}%{' '}
                            {RESOURCE_MAP.get(report.rewards.miningBonus.resourceId as ResourceId)?.name || report.rewards.miningBonus.resourceId}{' '}
                            for {report.rewards.miningBonus.durationMonths}mo
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
