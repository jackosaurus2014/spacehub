'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AllianceMember {
  companyName: string;
  role: 'leader' | 'officer' | 'member';
  netWorth: number;
  joinedAt: number;
  isYou: boolean;
}

interface AllianceBonus {
  label: string;
  icon: string;
  value: number; // percentage
  type: 'revenue' | 'mining' | 'research' | 'build_speed' | 'market';
}

interface SharedFacility {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
  contributedBy: string;
}

interface Alliance {
  id: string;
  name: string;
  tag: string;
  memberCount: number;
  totalNetWorth: number;
  members: AllianceMember[];
  bonuses: AllianceBonus[];
  sharedFacilities: SharedFacility[];
  createdAt: number;
}

interface AllianceListing {
  id: string;
  name: string;
  tag: string;
  memberCount: number;
  totalNetWorth: number;
  isOpen: boolean;
}

interface AlliancePanelProps {
  state: GameState;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AlliancePanel({ state }: AlliancePanelProps) {
  const [myAlliance, setMyAlliance] = useState<Alliance | null>(null);
  const [listings, setListings] = useState<AllianceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create alliance form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTag, setCreateTag] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // ─── Fetch Alliance Data ─────────────────────────────────────────────────

  const fetchAlliances = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliances');
      if (!res.ok) throw new Error('Failed to load alliance data');
      const data = await res.json();
      setMyAlliance(data.myAlliance || null);
      setListings(data.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alliances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlliances();
    const interval = setInterval(fetchAlliances, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlliances]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (actionLoading) return;
    setCreateError(null);

    const trimmedName = createName.trim();
    const trimmedTag = createTag.trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 3) {
      setCreateError('Corporation name must be at least 3 characters');
      return;
    }
    if (trimmedTag.length < 3 || trimmedTag.length > 5) {
      setCreateError('Tag must be 3-5 characters');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: trimmedName, tag: trimmedTag }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('milestone');
        setShowCreateForm(false);
        setCreateName('');
        setCreateTag('');
        await fetchAlliances();
      } else {
        setCreateError(data.error || 'Failed to create alliance');
        playSound('error');
      }
    } catch {
      setCreateError('Network error. Please try again.');
      playSound('error');
    }
    setActionLoading(false);
  }, [createName, createTag, actionLoading, fetchAlliances]);

  const handleJoin = useCallback(async (allianceId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', allianceId }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('build_complete');
        await fetchAlliances();
      } else {
        setError(data.error || 'Failed to join alliance');
        playSound('error');
      }
    } catch {
      setError('Network error. Please try again.');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, fetchAlliances]);

  const handleLeave = useCallback(async () => {
    if (actionLoading) return;
    if (!confirm('Are you sure you want to leave this corporation?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('click');
        await fetchAlliances();
      } else {
        setError(data.error || 'Failed to leave alliance');
        playSound('error');
      }
    } catch {
      setError('Network error. Please try again.');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, fetchAlliances]);

  // ─── Loading / Error States ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-slate-400 text-xs">Loading corporations...</p>
        </div>
      </div>
    );
  }

  if (error && !myAlliance) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-red-400 text-xs mb-2">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchAlliances(); }}
            className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── In an Alliance ──────────────────────────────────────────────────────

  if (myAlliance) {
    return (
      <div className="space-y-4">
        {/* Corporation Header */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <h3 className="text-white text-sm font-semibold">{myAlliance.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                  [{myAlliance.tag}]
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px]">Combined Net Worth</p>
              <p className="text-purple-300 text-sm font-bold font-mono">{formatMoney(myAlliance.totalNetWorth)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-2">
            <span>{myAlliance.memberCount} member{myAlliance.memberCount !== 1 ? 's' : ''}</span>
            <span>Founded {new Date(myAlliance.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Alliance Bonuses */}
        {myAlliance.bonuses.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>⚡</span> Corporation Bonuses
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {myAlliance.bonuses.map((bonus) => (
                <div
                  key={bonus.type}
                  className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{bonus.icon}</span>
                    <span className="text-slate-300 text-[11px]">{bonus.label}</span>
                  </div>
                  <p className="text-green-400 text-xs font-bold font-mono">+{bonus.value}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member Roster */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>👥</span> Members ({myAlliance.members.length})
          </h3>
          <div className="space-y-1.5">
            {myAlliance.members.map((member) => (
              <div
                key={member.companyName}
                className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                  member.isYou ? 'bg-cyan-500/5 border border-cyan-500/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {member.role === 'leader' ? '👑' : member.role === 'officer' ? '⭐' : '🧑‍🚀'}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${member.isYou ? 'text-cyan-300' : 'text-white'}`}>
                        {member.companyName}
                      </span>
                      {member.isYou && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 capitalize">{member.role}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs font-mono">{formatMoney(member.netWorth)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shared Facilities */}
        {myAlliance.sharedFacilities.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>🏭</span> Shared Facilities
            </h3>
            <div className="space-y-2">
              {myAlliance.sharedFacilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{facility.icon}</span>
                    <div>
                      <p className="text-white text-xs font-medium">{facility.name}</p>
                      <p className="text-slate-500 text-[10px]">{facility.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 text-[10px] font-mono">Lv.{facility.level}</span>
                    <p className="text-slate-600 text-[9px]">by {facility.contributedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave Corporation */}
        <div className="flex justify-center">
          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Leaving...' : 'Leave Corporation'}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Not in an Alliance ────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Not in Corporation Banner */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
        <span className="text-2xl block mb-2">🛡️</span>
        <h3 className="text-white text-sm font-semibold mb-1">No Corporation</h3>
        <p className="text-slate-400 text-xs mb-3">
          Join or create a corporation to earn shared bonuses and access shared facilities.
        </p>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create Corporation'}
        </button>
      </div>

      {/* Create Alliance Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>✨</span> Create New Corporation
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Corporation Name
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Solar Dominion"
                maxLength={30}
                className="w-full h-8 px-3 rounded-lg bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-purple-500/30 placeholder-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Tag (3-5 characters)
              </label>
              <input
                type="text"
                value={createTag}
                onChange={(e) => setCreateTag(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5))}
                placeholder="e.g. SDOM"
                maxLength={5}
                className="w-32 h-8 px-3 rounded-lg bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-purple-500/30 placeholder-slate-600 font-mono uppercase"
              />
            </div>
            {createError && (
              <p className="text-red-400 text-[10px]">{createError}</p>
            )}
            <button
              onClick={handleCreate}
              disabled={actionLoading || !createName.trim() || createTag.trim().length < 3}
              className="w-full py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {actionLoading ? 'Creating...' : `Create [${createTag.toUpperCase() || '???'}] ${createName.trim() || 'Corporation'}`}
            </button>
          </div>
        </div>
      )}

      {/* Available Alliances */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📋</span> Available Corporations
        </h3>
        {listings.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">
            No corporations available yet. Be the first to create one!
          </p>
        ) : (
          <div className="space-y-2">
            {listings.map((alliance) => (
              <div
                key={alliance.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-xs font-medium">{alliance.name}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                      [{alliance.tag}]
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{alliance.memberCount} member{alliance.memberCount !== 1 ? 's' : ''}</span>
                    <span>{formatMoney(alliance.totalNetWorth)} combined</span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoin(alliance.id)}
                  disabled={actionLoading || !alliance.isOpen}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-colors ${
                    alliance.isOpen && !actionLoading
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30'
                      : 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                  }`}
                >
                  {!alliance.isOpen ? 'Closed' : actionLoading ? 'Joining...' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Info footer */}
      <p className="text-slate-600 text-[10px] text-center">
        Corporation members share bonuses to revenue, mining output, and research speed.
        Facilities built by members benefit the entire corporation.
      </p>
    </div>
  );
}
