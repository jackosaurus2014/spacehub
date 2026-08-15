'use client';

// ─── Alliance Season Charters (Live-Service Wave LS5) ───────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS5. Self-fetching panel, same pattern as
// AllianceTreasuryPanel.tsx — the pledge board is server truth (member
// contributions are aggregated from ledgered rows, never client-reported),
// so this component only ever reads and posts intents; it never computes a
// "met" verdict locally.

import { useState, useEffect, useCallback } from 'react';
import { playSound } from '@/lib/game/sound-engine';

interface CharterDef {
  type: string;
  name: string;
  icon: string;
  description: string;
  metricLabel: string;
  metricUnit: string;
  perMemberSeasonTarget: number;
}

interface BoardRow {
  profileId: string;
  companyName: string;
  role: string;
  isYou: boolean;
  pledged: boolean;
  quotaAmount: number;
  contributed: number;
  history: { weekIndex: number; met: boolean; quotaAmount: number; contributed: number }[];
}

interface ActiveCharter {
  id: string;
  charterType: string;
  def: CharterDef | null;
  goalTarget: number;
  progress: number;
  escrowTotal: number;
  escrowSpent: number;
  escrowRemaining: number;
  status: string;
  seasonNumber: number;
  startsAt: number;
  endsAt: number;
  grade: string | null;
}

interface CharterData {
  inAlliance: boolean;
  canRatify: boolean;
  isOfficer: boolean;
  charter: ActiveCharter | null;
  catalogue: CharterDef[];
  weekIndex: number;
  weekEndsAtMs: number;
  board: BoardRow[];
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatMetric(n: number, unit: string): string {
  if (unit === 'money') return formatCompact(n);
  return Math.round(n).toLocaleString();
}

export default function AllianceCharterPanel() {
  const [data, setData] = useState<CharterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [myQuota, setMyQuota] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliances/charter');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load charter');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRatify = useCallback(async () => {
    if (actionLoading || !selectedType) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliances/charter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ratify', charterType: selectedType }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('milestone');
        await fetchData();
      } else {
        setError(result.error || 'Ratification failed');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, selectedType, fetchData]);

  const handlePledge = useCallback(async () => {
    if (actionLoading) return;
    const quotaAmount = Math.max(0, Math.round(Number(myQuota) || 0));
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliances/charter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pledge', quotaAmount }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('click');
        setMyQuota('');
        await fetchData();
      } else {
        setError(result.error || 'Pledge failed');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, myQuota, fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="font-hud text-slate-400 text-xs">Loading season charter...</p>
      </div>
    );
  }

  if (!data?.inAlliance) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center text-slate-400 text-xs">
        Join a corporation to ratify a season charter.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 text-[11px]">{error}</div>
      )}

      {!data.charter ? (
        <div className="hud-frame relative rounded-2xl border border-teal-500/25 p-4" style={{ background: '#050510' }}>
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <h3 className="font-hud text-white text-sm font-bold mb-1">No active season charter</h3>
          <p className="text-slate-400 text-[11px] mb-3">
            A charter is a shared, season-long goal your whole corporation pledges toward. Each member sets a
            weekly quota; met weeks pay alliance XP and a personal stipend from the escrow. Missing a week only
            forfeits that week&apos;s stipend — never a penalty.
          </p>
          {data.canRatify ? (
            <div className="space-y-2">
              {data.catalogue.map(def => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => setSelectedType(def.type)}
                  className={`w-full min-h-[44px] text-left rounded-xl border p-2.5 transition-colors ${
                    selectedType === def.type ? 'border-teal-500/50 bg-teal-500/10' : 'border-white/[0.08] hover:border-teal-500/30'
                  }`}
                >
                  <div className="text-xs text-white font-semibold flex items-center gap-1.5">
                    <span aria-hidden="true">{def.icon}</span> {def.name}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{def.description}</p>
                  <div className="text-[9px] text-teal-300 mt-1">
                    Season target: {formatMetric(def.perMemberSeasonTarget, def.metricUnit)}/member · {def.metricLabel}
                  </div>
                </button>
              ))}
              <button
                type="button"
                disabled={!selectedType || actionLoading}
                onClick={handleRatify}
                className={`min-h-[44px] w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  selectedType && !actionLoading ? 'bg-teal-600 text-white hover:bg-teal-500' : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                }`}
              >
                Ratify charter (funds escrow from treasury)
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-[11px]">Only leaders and officers can ratify a charter.</p>
          )}
        </div>
      ) : (
        <>
          {/* Charter header + progress */}
          <div className="hud-frame relative rounded-2xl border border-teal-500/25 p-4" style={{ background: '#050510' }}>
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
                  <span aria-hidden="true">{data.charter.def?.icon}</span> {data.charter.def?.name}
                </h3>
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Season {data.charter.seasonNumber}</div>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-teal-500/40 text-teal-200 bg-teal-500/10">
                {data.charter.status}
              </span>
            </div>
            <div className="mb-1.5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="game-label">
                  {data.charter.def?.metricLabel} — {formatMetric(data.charter.progress, data.charter.def?.metricUnit || 'count')}
                  {' '}/ {formatMetric(data.charter.goalTarget, data.charter.def?.metricUnit || 'count')}
                </span>
                <span className="font-hud text-teal-200 font-bold">
                  {Math.min(100, Math.round((data.charter.progress / Math.max(1, data.charter.goalTarget)) * 100))}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                  style={{ width: `${Math.min(100, Math.round((data.charter.progress / Math.max(1, data.charter.goalTarget)) * 100))}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center mt-2">
              <div className="rounded bg-white/[0.03] p-1.5">
                <div className="game-label text-[8px]">Escrow remaining</div>
                <div className="font-hud text-[10px] text-white font-bold">{formatCompact(data.charter.escrowRemaining)}</div>
              </div>
              <div className="rounded bg-white/[0.03] p-1.5">
                <div className="game-label text-[8px]">Season ends</div>
                <div className="font-hud text-[10px] text-amber-200 font-bold">
                  {new Date(data.charter.endsAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* My pledge */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="game-label text-[9px] mb-1.5">My weekly pledge (week ends {new Date(data.weekEndsAtMs).toLocaleDateString()})</div>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={myQuota}
                onChange={e => setMyQuota(e.target.value)}
                placeholder={String(data.board.find(b => b.isYou)?.quotaAmount ?? 0)}
                className="flex-1 min-h-[44px] rounded-lg border border-white/[0.08] bg-black/30 px-2.5 text-xs text-white"
                aria-label="Weekly pledge quota"
              />
              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePledge}
                className="min-h-[44px] px-3 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
              >
                Pledge
              </button>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Set to 0 to opt out — no penalty, just no stipend.</p>
          </div>

          {/* Pledge board */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="game-label text-[9px] mb-2">Pledge board — visible to the whole corporation</div>
            <div className="space-y-1.5">
              {data.board.map(row => (
                <div key={row.profileId} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-2.5 py-1.5 text-[11px]">
                  <span className={`min-w-0 truncate ${row.isYou ? 'text-teal-300 font-semibold' : 'text-slate-300'}`}>
                    {row.companyName}{row.isYou ? ' (you)' : ''}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {row.history.map(h => (
                      <span
                        key={h.weekIndex}
                        aria-label={h.met ? 'Met' : 'Missed'}
                        title={h.met ? 'Met this week' : 'Did not meet this week'}
                        className={`text-[10px] ${h.met ? 'text-emerald-400' : 'text-slate-600'}`}
                      >
                        {h.met ? '●' : '—'}
                      </span>
                    ))}
                    <span className="text-[10px] text-slate-500 font-hud ml-1">
                      {row.pledged ? `${formatMetric(row.contributed, data.charter?.def?.metricUnit || 'count')}/${formatMetric(row.quotaAmount, data.charter?.def?.metricUnit || 'count')}` : 'not pledged'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
