'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import Image from 'next/image';

// ─── Types ───────────────────────────────────────────────────────────────────

type BountyStatus = 'open' | 'partial' | 'filled' | 'expired';

interface Bounty {
  id: string;
  posterName: string;
  resourceId: string;
  quantity: number;
  filledQuantity: number;
  pricePerUnit: number;
  status: BountyStatus;
  expiresAtMs: number;
  createdAtMs: number;
  isYours: boolean;
}

interface BountyPanelProps {
  state: GameState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: BountyStatus): string {
  switch (status) {
    case 'open': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'partial': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'filled': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    case 'expired': return 'text-red-400 bg-red-500/10 border-red-500/20';
  }
}

function getStatusLabel(status: BountyStatus): string {
  switch (status) {
    case 'open': return 'Open';
    case 'partial': return 'Partial';
    case 'filled': return 'Filled';
    case 'expired': return 'Expired';
  }
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'Expired';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BountyPanel({ state }: BountyPanelProps) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // bountyId being acted on

  // Post bounty form
  const [showPostForm, setShowPostForm] = useState(false);
  const [postResourceId, setPostResourceId] = useState<string>(RESOURCES[0]?.id || '');
  const [postQuantity, setPostQuantity] = useState(10);
  const [postPricePerUnit, setPostPricePerUnit] = useState(0);
  const [postError, setPostError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Countdown timer
  const [now, setNow] = useState(Date.now());

  // ─── Fetch Bounties ──────────────────────────────────────────────────────

  const fetchBounties = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/bounties');
      if (!res.ok) throw new Error('Failed to load bounties');
      const data = await res.json();
      setBounties(data.bounties || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bounties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBounties();
    const interval = setInterval(fetchBounties, 30_000);
    return () => clearInterval(interval);
  }, [fetchBounties]);

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-set price to base market price when resource changes
  useEffect(() => {
    const def = RESOURCE_MAP.get(postResourceId as never);
    if (def) {
      setPostPricePerUnit(def.baseMarketPrice);
    }
  }, [postResourceId]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handlePost = useCallback(async () => {
    if (posting) return;
    setPostError(null);

    if (postQuantity <= 0) {
      setPostError('Quantity must be greater than 0');
      return;
    }
    if (postPricePerUnit <= 0) {
      setPostError('Price per unit must be greater than 0');
      return;
    }

    const totalCost = postQuantity * postPricePerUnit;
    if (state.money < totalCost) {
      setPostError(`Insufficient funds. Need ${formatMoney(totalCost)} to post this bounty.`);
      return;
    }

    setPosting(true);
    try {
      const res = await fetch('/api/space-tycoon/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          resourceId: postResourceId,
          quantity: postQuantity,
          pricePerUnit: postPricePerUnit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('trade');
        setShowPostForm(false);
        setPostQuantity(10);
        await fetchBounties();
      } else {
        setPostError(data.error || 'Failed to post bounty');
        playSound('error');
      }
    } catch {
      setPostError('Network error. Please try again.');
      playSound('error');
    }
    setPosting(false);
  }, [postResourceId, postQuantity, postPricePerUnit, posting, state.money, fetchBounties]);

  const handleFill = useCallback(async (bountyId: string) => {
    if (actionLoading) return;
    setActionLoading(bountyId);
    try {
      const res = await fetch('/api/space-tycoon/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fill', bountyId }),
      });
      const data = await res.json();
      if (data.success) {
        playSound('money');
        await fetchBounties();
      } else {
        setError(data.error || 'Failed to fill bounty');
        playSound('error');
      }
    } catch {
      setError('Network error. Please try again.');
      playSound('error');
    }
    setActionLoading(null);
  }, [actionLoading, fetchBounties]);

  // ─── Derived Data ────────────────────────────────────────────────────────

  const activeBounties = bounties.filter(b => b.status === 'open' || b.status === 'partial');
  const completedBounties = bounties.filter(b => b.status === 'filled' || b.status === 'expired');

  // ─── Loading / Error States ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-slate-400 text-xs">Loading bounties...</p>
        </div>
      </div>
    );
  }

  if (error && bounties.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-red-400 text-xs mb-2">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchBounties(); }}
            className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Bounty Board</span>
        </div>
        <span className="text-[10px] text-slate-500">{activeBounties.length} active bount{activeBounties.length === 1 ? 'y' : 'ies'}</span>
      </div>

      {/* Post Bounty Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowPostForm(!showPostForm)}
          className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
        >
          {showPostForm ? 'Cancel' : '📜 Post Bounty'}
        </button>
      </div>

      {/* Post Bounty Form */}
      {showPostForm && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📜</span> Post New Bounty
          </h3>
          <p className="text-slate-400 text-[10px] mb-3">
            Request a resource from other players. You pay upfront; funds are held in escrow until filled.
          </p>
          <div className="space-y-3">
            {/* Resource Select */}
            <div>
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Resource
              </label>
              <select
                value={postResourceId}
                onChange={(e) => setPostResourceId(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-amber-500/30 appearance-none cursor-pointer"
              >
                {RESOURCES.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.icon} {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPostQuantity(Math.max(1, postQuantity - 10))}
                  className="w-7 h-7 rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors"
                >-</button>
                <input
                  type="number"
                  min={1}
                  value={postQuantity}
                  onChange={(e) => setPostQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 h-7 rounded bg-white/[0.06] text-white text-xs text-center border border-white/[0.06] focus:outline-none focus:border-amber-500/30"
                />
                <button
                  onClick={() => setPostQuantity(postQuantity + 10)}
                  className="w-7 h-7 rounded bg-white/[0.06] text-white text-sm hover:bg-white/[0.1] transition-colors"
                >+</button>
              </div>
            </div>

            {/* Price per Unit */}
            <div>
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Price per Unit
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs">$</span>
                <input
                  type="number"
                  min={1}
                  value={postPricePerUnit}
                  onChange={(e) => setPostPricePerUnit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 h-7 rounded bg-white/[0.06] text-white text-xs text-center border border-white/[0.06] focus:outline-none focus:border-amber-500/30 font-mono"
                />
                <span className="text-slate-500 text-[10px]">/unit</span>
              </div>
              <p className="text-slate-600 text-[9px] mt-1">
                Base market: {formatMoney(RESOURCE_MAP.get(postResourceId as never)?.baseMarketPrice || 0)}
              </p>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <span className="text-slate-400 text-xs">Total Escrow</span>
              <span className="text-amber-400 text-sm font-bold font-mono">{formatMoney(postQuantity * postPricePerUnit)}</span>
            </div>

            {postError && (
              <p className="text-red-400 text-[10px]">{postError}</p>
            )}

            <button
              onClick={handlePost}
              disabled={posting || postQuantity <= 0 || postPricePerUnit <= 0}
              className="w-full py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {posting ? 'Posting...' : `Post Bounty for ${formatMoney(postQuantity * postPricePerUnit)}`}
            </button>
          </div>
        </div>
      )}

      {/* Active Bounties */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>🎯</span> Active Bounties
        </h3>
        {activeBounties.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">
            No active bounties. Post one to request resources from other players!
          </p>
        ) : (
          <div className="space-y-2">
            {activeBounties.map((bounty) => {
              const def = RESOURCE_MAP.get(bounty.resourceId as never);
              const remaining = bounty.quantity - bounty.filledQuantity;
              const totalValue = remaining * bounty.pricePerUnit;
              const timeLeft = bounty.expiresAtMs - now;
              const held = state.resources[bounty.resourceId] || 0;
              const canFill = !bounty.isYours && held > 0 && remaining > 0;

              return (
                <div
                  key={bounty.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    bounty.isYours
                      ? 'bg-cyan-500/5 border-cyan-500/10'
                      : 'bg-white/[0.03] border-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  {/* Top row: resource + status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {def && RESOURCE_ASSETS[bounty.resourceId] ? (
                        <Image
                          src={RESOURCE_ASSETS[bounty.resourceId]}
                          alt=""
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <span className="text-sm">{def?.icon || '?'}</span>
                      )}
                      <div>
                        <span className="text-white text-xs font-medium">{def?.name || bounty.resourceId}</span>
                        {bounty.isYours && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">
                            YOURS
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${getStatusColor(bounty.status)}`}>
                      {getStatusLabel(bounty.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <p className="text-slate-500 text-[9px] uppercase">Needed</p>
                      <p className="text-white text-xs font-mono">{remaining.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[9px] uppercase">Price/Unit</p>
                      <p className="text-amber-400 text-xs font-mono">{formatMoney(bounty.pricePerUnit)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[9px] uppercase">Total Value</p>
                      <p className="text-green-400 text-xs font-mono">{formatMoney(totalValue)}</p>
                    </div>
                  </div>

                  {/* Progress bar for partial fills */}
                  {bounty.filledQuantity > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                        <span>Filled</span>
                        <span>{bounty.filledQuantity}/{bounty.quantity}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${(bounty.filledQuantity / bounty.quantity) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom row: expiry + action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 text-[9px]">Posted by</span>
                      <span className={`text-[10px] font-medium ${bounty.isYours ? 'text-cyan-300' : 'text-white'}`}>
                        {bounty.posterName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${timeLeft <= 300_000 ? 'text-red-400' : 'text-slate-500'}`}>
                        {formatCountdown(timeLeft)}
                      </span>
                      {canFill && (
                        <button
                          onClick={() => handleFill(bounty.id)}
                          disabled={actionLoading === bounty.id}
                          className="px-3 py-1 text-[10px] font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          {actionLoading === bounty.id ? 'Filling...' : `Fill (${Math.min(held, remaining)})`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed / Expired Bounties */}
      {completedBounties.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📜</span> Recent History
          </h3>
          <div className="space-y-1.5">
            {completedBounties.slice(0, 10).map((bounty) => {
              const def = RESOURCE_MAP.get(bounty.resourceId as never);
              return (
                <div
                  key={bounty.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {def && RESOURCE_ASSETS[bounty.resourceId] ? (
                      <Image
                        src={RESOURCE_ASSETS[bounty.resourceId]}
                        alt=""
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="text-xs">{def?.icon || '?'}</span>
                    )}
                    <div>
                      <span className="text-slate-300 text-[11px]">{def?.name || bounty.resourceId}</span>
                      <span className="text-slate-600 text-[10px] ml-1.5">x{bounty.quantity}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] font-mono">{formatMoney(bounty.quantity * bounty.pricePerUnit)}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${getStatusColor(bounty.status)}`}>
                      {getStatusLabel(bounty.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Info footer */}
      <p className="text-slate-600 text-[10px] text-center">
        Post bounties to request resources you need. Fill other players&apos; bounties to earn money.
        Bounty funds are held in escrow until filled or expired.
      </p>
    </div>
  );
}
