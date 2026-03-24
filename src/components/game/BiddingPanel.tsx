'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BiddingContract {
  id: string;
  contractType: string;
  tier: number;
  title: string;
  description: string;
  requirements: ContractRequirements;
  minBid: number;
  maxBid: number;
  collateralPct: number;
  status: string;
  biddingEndsAt: string;
  deliveryDeadline: string | null;
  timeRemainingMs: number;
  isExpired: boolean;
  bidCount: number | null;
  estimatedValueRange: string | null;
  winnerCompany: string | null;
  winningBid: number | null;
  baseReward: number;
  myBid: {
    id: string;
    bidAmount: number;
    deliveryPromise: number | null;
    collateralLocked: number;
    status: string;
    compositeScore: number | null;
  } | null;
}

interface ContractRequirements {
  type: string;
  target: number;
  locationId?: string;
  resourceId?: string;
  categoryId?: string;
  leaseDurationMonths?: number;
  miningBonus?: number;
  label: string;
}

interface BiddingMeta {
  total: number;
  gameMonth: number;
  playerReputation: number;
  activeBidCount: number;
  playerMoney: number;
  bidReliability: number;
  biddingCooldownUntil: string | null;
}

interface BiddingPanelProps {
  state: GameState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'Expired';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function getTierLabel(tier: number): string {
  const labels: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
  return labels[tier] || `${tier}`;
}

function getTierBorderColor(tier: number): string {
  const colors: Record<number, string> = {
    1: 'border-green-500/30',
    2: 'border-blue-500/30',
    3: 'border-purple-500/30',
    4: 'border-amber-500/30',
    5: 'border-red-500/30',
  };
  return colors[tier] || 'border-white/10';
}

function getTierBgColor(tier: number): string {
  const colors: Record<number, string> = {
    1: 'bg-green-500/5',
    2: 'bg-blue-500/5',
    3: 'bg-purple-500/5',
    4: 'bg-amber-500/5',
    5: 'bg-red-500/5',
  };
  return colors[tier] || 'bg-white/[0.02]';
}

function getTierTextColor(tier: number): string {
  const colors: Record<number, string> = {
    1: 'text-green-400',
    2: 'text-blue-400',
    3: 'text-purple-400',
    4: 'text-amber-400',
    5: 'text-red-400',
  };
  return colors[tier] || 'text-white';
}

function getTypeIcon(contractType: string): string {
  const icons: Record<string, string> = {
    satellite_deployment: '\u{1F6F0}\uFE0F',
    resource_delivery: '\u{1F4E6}',
    station_construction: '\u{1F3D7}\uFE0F',
    fleet_transport: '\u{1F680}',
    research_partnership: '\u{1F52C}',
    emergency_supply: '\u{26A0}\uFE0F',
    mining_rights_lease: '\u26CF\uFE0F',
  };
  return icons[contractType] || '\u{1F4C4}';
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'open': return { label: 'OPEN', className: 'text-green-400 bg-green-500/10 border-green-500/20' };
    case 'awarded': return { label: 'AWARDED', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'in_progress': return { label: 'IN PROGRESS', className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    case 'completed': return { label: 'COMPLETED', className: 'text-green-400 bg-green-500/10 border-green-500/20' };
    case 'failed': return { label: 'FAILED', className: 'text-red-400 bg-red-500/10 border-red-500/20' };
    case 'expired': return { label: 'EXPIRED', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    default: return { label: status.toUpperCase(), className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BiddingPanel({ state }: BiddingPanelProps) {
  const [contracts, setContracts] = useState<BiddingContract[]>([]);
  const [meta, setMeta] = useState<BiddingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [tierFilter, setTierFilter] = useState<string>('');

  // Sub-tab: 'board' | 'mybids'
  const [activeTab, setActiveTab] = useState<'board' | 'mybids'>('board');

  // Bid modal state
  const [bidModalContract, setBidModalContract] = useState<BiddingContract | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidDeliveryPromise, setBidDeliveryPromise] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  // Fulfill/abandon state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (tierFilter) params.set('tier', tierFilter);

      const res = await fetch(`/api/space-tycoon/bidding?${params}`);
      const data = await res.json();

      if (res.ok) {
        setContracts(data.contracts || []);
        setMeta(data.meta || null);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch contracts');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tierFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Refresh on tab switch
  useEffect(() => {
    if (activeTab === 'mybids') {
      // Fetch all statuses to see my bids
      setStatusFilter('all');
    } else {
      setStatusFilter('open');
    }
  }, [activeTab]);

  // My bids
  const myBids = useMemo(() => {
    return contracts.filter(c => c.myBid !== null);
  }, [contracts]);

  const myActiveBids = useMemo(() => {
    return myBids.filter(c => c.myBid?.status === 'pending');
  }, [myBids]);

  const myWonContracts = useMemo(() => {
    return myBids.filter(c => c.myBid?.status === 'won' && c.status === 'awarded');
  }, [myBids]);

  // ── Bid Submission ──────────────────────────────────────────────────

  const openBidModal = (contract: BiddingContract) => {
    setBidModalContract(contract);
    setBidAmount('');
    setBidDeliveryPromise('3');
    setBidError(null);
    playSound('click');
  };

  const closeBidModal = () => {
    setBidModalContract(null);
    setBidError(null);
  };

  const submitBid = async () => {
    if (!bidModalContract) return;

    const amount = parseFloat(bidAmount);
    const delivery = parseInt(bidDeliveryPromise, 10);

    if (isNaN(amount) || amount <= 0) {
      setBidError('Enter a valid bid amount');
      return;
    }

    if (amount < bidModalContract.minBid) {
      setBidError(`Minimum bid is ${formatShort(bidModalContract.minBid)}`);
      return;
    }

    if (amount > bidModalContract.maxBid) {
      setBidError(`Maximum bid is ${formatShort(bidModalContract.maxBid)}`);
      return;
    }

    if (isNaN(delivery) || delivery < 1) {
      setBidError('Delivery promise must be at least 1 month');
      return;
    }

    setBidSubmitting(true);
    setBidError(null);

    try {
      const res = await fetch('/api/space-tycoon/bidding/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: bidModalContract.id,
          bidAmount: amount,
          deliveryPromise: delivery,
        }),
      });

      const data = await res.json();

      if (data.success) {
        playSound('click');
        closeBidModal();
        fetchContracts(); // Refresh
      } else {
        setBidError(data.error || 'Failed to place bid');
      }
    } catch (err) {
      setBidError('Network error');
    } finally {
      setBidSubmitting(false);
    }
  };

  // ── Fulfill / Abandon ──────────────────────────────────────────────

  const handleFulfillAction = async (contractId: string, action: 'claim' | 'abandon') => {
    setActionLoading(contractId);
    try {
      const res = await fetch('/api/space-tycoon/bidding/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, action }),
      });

      const data = await res.json();

      if (data.success || data.result === 'incomplete') {
        playSound('click');
        fetchContracts();
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error while processing action');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Computed values for bid modal ──────────────────────────────────

  const bidCollateral = useMemo(() => {
    if (!bidModalContract || !bidAmount) return 0;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) return 0;
    return Math.round(amount * bidModalContract.collateralPct);
  }, [bidModalContract, bidAmount]);

  const bidProfit = useMemo(() => {
    if (!bidModalContract || !bidAmount) return 0;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) return 0;
    // Rough estimate: bid amount minus estimated cost (baseReward * 0.7 as rough cost)
    const estimatedCost = bidModalContract.baseReward * 0.7;
    return amount - estimatedCost;
  }, [bidModalContract, bidAmount]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header with sub-tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'board'
                ? 'bg-cyan-600 text-white'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Bidding Board
          </button>
          <button
            onClick={() => setActiveTab('mybids')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'mybids'
                ? 'bg-cyan-600 text-white'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            My Bids {myActiveBids.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-400">
                {myActiveBids.length}
              </span>
            )}
          </button>
        </div>

        {/* Stats bar */}
        {meta && (
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span>Active Bids: <span className="text-cyan-400 font-mono">{meta.activeBidCount}/3</span></span>
            <span>Reliability: <span className={`font-mono ${meta.bidReliability >= 0.9 ? 'text-green-400' : meta.bidReliability >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
              {(meta.bidReliability * 100).toFixed(0)}%
            </span></span>
            <span>Balance: <span className="text-green-400 font-mono">{formatMoney(meta.playerMoney)}</span></span>
          </div>
        )}
      </div>

      {/* Cooldown warning */}
      {meta?.biddingCooldownUntil && new Date(meta.biddingCooldownUntil) > new Date() && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          Bidding cooldown active until {new Date(meta.biddingCooldownUntil).toLocaleString()}.
          You cannot place new bids during this period.
        </div>
      )}

      {/* Filters (board tab only) */}
      {activeTab === 'board' && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 focus:outline-none focus:border-cyan-500/40"
          >
            <option value="">All Tiers</option>
            <option value="1">Tier I</option>
            <option value="2">Tier II</option>
            <option value="3">Tier III</option>
            <option value="4">Tier IV</option>
            <option value="5">Tier V</option>
          </select>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-slate-500 text-xs ml-2">Loading contracts...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
          <button
            onClick={fetchContracts}
            className="ml-2 underline hover:text-red-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Board Tab ─────────────────────────────────────────────── */}
      {!loading && activeTab === 'board' && (
        <div className="space-y-3">
          {contracts.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-8">
              No active contracts. Check back soon!
            </p>
          )}

          {/* Emergency contracts first */}
          {contracts.filter(c => c.contractType === 'emergency_supply').map(contract => (
            <ContractCard
              key={contract.id}
              contract={contract}
              now={now}
              isEmergency
              onBid={() => openBidModal(contract)}
              meta={meta}
            />
          ))}

          {/* Standard contracts */}
          {contracts.filter(c => c.contractType !== 'emergency_supply').map(contract => (
            <ContractCard
              key={contract.id}
              contract={contract}
              now={now}
              onBid={() => openBidModal(contract)}
              meta={meta}
            />
          ))}
        </div>
      )}

      {/* ── My Bids Tab ───────────────────────────────────────────── */}
      {!loading && activeTab === 'mybids' && (
        <div className="space-y-4">
          {/* Active/Pending Bids */}
          {myActiveBids.length > 0 && (
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Pending Bids ({myActiveBids.length}/3)
              </h3>
              <div className="space-y-2">
                {myActiveBids.map(contract => (
                  <MyBidCard
                    key={contract.id}
                    contract={contract}
                    now={now}
                    type="pending"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Won Contracts */}
          {myWonContracts.length > 0 && (
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Won Contracts ({myWonContracts.length})
              </h3>
              <div className="space-y-2">
                {myWonContracts.map(contract => (
                  <MyBidCard
                    key={contract.id}
                    contract={contract}
                    now={now}
                    type="won"
                    onClaim={() => handleFulfillAction(contract.id, 'claim')}
                    onAbandon={() => handleFulfillAction(contract.id, 'abandon')}
                    isLoading={actionLoading === contract.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Results */}
          {myBids.filter(c => c.myBid?.status === 'lost' || c.myBid?.status === 'withdrawn').length > 0 && (
            <div>
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                Recent Results
              </h3>
              <div className="space-y-1.5">
                {myBids.filter(c => c.myBid?.status === 'lost' || c.myBid?.status === 'withdrawn').map(contract => (
                  <MyBidCard
                    key={contract.id}
                    contract={contract}
                    now={now}
                    type="result"
                  />
                ))}
              </div>
            </div>
          )}

          {myBids.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-8">
              You have no bids. Visit the Bidding Board to place your first bid!
            </p>
          )}

          {/* Stats summary */}
          {meta && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Bidding Stats</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-600">Win Rate</span>
                  <p className="text-white font-mono">
                    {meta.activeBidCount > 0 ? '...' : '0%'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Reliability</span>
                  <p className={`font-mono ${meta.bidReliability >= 0.9 ? 'text-green-400' : meta.bidReliability >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(meta.bidReliability * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Active Bids</span>
                  <p className="text-cyan-400 font-mono">{meta.activeBidCount}/3</p>
                </div>
                <div>
                  <span className="text-slate-600">Reputation</span>
                  <p className="text-white font-mono">{meta.playerReputation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bid Submission Modal ───────────────────────────────────── */}
      {bidModalContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className={`p-4 ${getTierBgColor(bidModalContract.tier)} border-b ${getTierBorderColor(bidModalContract.tier)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white text-sm font-bold">Place Bid</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">{bidModalContract.title}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getTierTextColor(bidModalContract.tier)} ${getTierBorderColor(bidModalContract.tier)}`}>
                  Tier {getTierLabel(bidModalContract.tier)}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Requirements */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Requirement</p>
                <p className="text-white text-xs">{bidModalContract.requirements.label}</p>
              </div>

              {/* Bid Amount Input */}
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Your Bid Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    placeholder={`${(bidModalContract.minBid / 1e6).toFixed(0)}M - ${(bidModalContract.maxBid / 1e6).toFixed(0)}M`}
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
                  />
                </div>
                <p className="text-slate-600 text-[10px] mt-1">
                  Range: {formatShort(bidModalContract.minBid)} - {formatShort(bidModalContract.maxBid)}
                </p>
              </div>

              {/* Delivery Promise */}
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Delivery Promise (game months)
                </label>
                <input
                  type="number"
                  value={bidDeliveryPromise}
                  onChange={e => setBidDeliveryPromise(e.target.value)}
                  min="1"
                  max="18"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                />
                <p className="text-slate-600 text-[10px] mt-1">
                  Faster delivery improves your bid score
                </p>
              </div>

              {/* Collateral & Cost Breakdown */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Collateral ({(bidModalContract.collateralPct * 100).toFixed(0)}%)</span>
                  <span className="text-amber-400 font-mono">{formatShort(bidCollateral)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Your balance</span>
                  <span className="text-green-400 font-mono">{meta ? formatMoney(meta.playerMoney) : '--'}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">After collateral lock</span>
                  <span className={`font-mono ${meta && meta.playerMoney - bidCollateral < 1_000_000 ? 'text-red-400' : 'text-slate-300'}`}>
                    {meta ? formatMoney(meta.playerMoney - bidCollateral) : '--'}
                  </span>
                </div>
                {bidAmount && (
                  <div className="flex justify-between text-[10px] pt-1 border-t border-white/[0.04]">
                    <span className="text-slate-500">Est. profit</span>
                    <span className={`font-mono ${bidProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bidProfit >= 0 ? '+' : ''}{formatShort(bidProfit)}
                    </span>
                  </div>
                )}
              </div>

              {/* Error */}
              {bidError && (
                <p className="text-red-400 text-xs">{bidError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={closeBidModal}
                  className="flex-1 py-2 text-xs font-medium text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBid}
                  disabled={bidSubmitting || !bidAmount || !bidDeliveryPromise}
                  className="flex-1 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
                >
                  {bidSubmitting ? 'Submitting...' : 'Submit Bid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ContractCard({
  contract,
  now,
  isEmergency,
  onBid,
  meta,
}: {
  contract: BiddingContract;
  now: number;
  isEmergency?: boolean;
  onBid: () => void;
  meta: BiddingMeta | null;
}) {
  const timeRemaining = new Date(contract.biddingEndsAt).getTime() - now;
  const statusBadge = getStatusBadge(contract.status);

  return (
    <div className={`rounded-xl border p-4 ${
      isEmergency
        ? 'border-red-500/30 bg-red-500/5'
        : `${getTierBorderColor(contract.tier)} ${getTierBgColor(contract.tier)}`
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{getTypeIcon(contract.contractType)}</span>
          <div className="min-w-0">
            <h4 className="text-white text-sm font-semibold truncate">{contract.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getTierTextColor(contract.tier)} ${getTierBorderColor(contract.tier)}`}>
                T{getTierLabel(contract.tier)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              {isEmergency && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse">
                  URGENT
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-xs mb-2">{contract.description}</p>

      {/* Requirements */}
      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-2">
        <p className="text-slate-300 text-[10px]">{contract.requirements.label}</p>
      </div>

      {/* Bid range and meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 mb-3">
        <span>Bid: <span className="text-slate-300 font-mono">{formatShort(contract.minBid)} - {formatShort(contract.maxBid)}</span></span>
        {contract.estimatedValueRange && (
          <span>Est: <span className="text-slate-300">{contract.estimatedValueRange}</span></span>
        )}
        <span>Bids: <span className="text-slate-300 font-mono">{contract.bidCount !== null ? contract.bidCount : '--'}</span></span>
        {contract.status === 'open' && (
          <span>Closes: <span className={`font-mono ${timeRemaining < 3600000 ? 'text-red-400' : 'text-slate-300'}`}>
            {formatCountdown(timeRemaining)}
          </span></span>
        )}
      </div>

      {/* My bid or action */}
      {contract.myBid ? (
        <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <div className="text-[10px]">
            <span className="text-slate-500">Your bid:</span>
            <span className="text-cyan-400 font-mono ml-1">{formatShort(contract.myBid.bidAmount)}</span>
            <span className="text-slate-600 ml-2">Collateral: {formatShort(contract.myBid.collateralLocked)}</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            contract.myBid.status === 'won' ? 'bg-green-500/10 text-green-400' :
            contract.myBid.status === 'lost' ? 'bg-red-500/10 text-red-400' :
            'bg-cyan-500/10 text-cyan-400'
          }`}>
            {contract.myBid.status.toUpperCase()}
          </span>
        </div>
      ) : (
        contract.status === 'open' && timeRemaining > 0 && (
          <button
            onClick={onBid}
            disabled={meta !== null && meta.activeBidCount >= 3}
            className="w-full py-2 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            {meta && meta.activeBidCount >= 3 ? 'Max Bids Reached' : 'Place Bid'}
          </button>
        )
      )}
    </div>
  );
}

function MyBidCard({
  contract,
  now,
  type,
  onClaim,
  onAbandon,
  isLoading,
}: {
  contract: BiddingContract;
  now: number;
  type: 'pending' | 'won' | 'result';
  onClaim?: () => void;
  onAbandon?: () => void;
  isLoading?: boolean;
}) {
  const bid = contract.myBid;
  if (!bid) return null;

  const deadlineMs = contract.deliveryDeadline
    ? new Date(contract.deliveryDeadline).getTime() - now
    : 0;

  return (
    <div className={`rounded-xl border p-3 ${
      type === 'won'
        ? 'border-amber-500/20 bg-amber-500/5'
        : type === 'pending'
        ? 'border-cyan-500/20 bg-cyan-500/5'
        : 'border-white/[0.06] bg-white/[0.02]'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{getTypeIcon(contract.contractType)}</span>
            <h4 className="text-white text-xs font-semibold truncate">{contract.title}</h4>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] px-1 py-0.5 rounded border font-bold ${getTierTextColor(contract.tier)} ${getTierBorderColor(contract.tier)}`}>
              T{getTierLabel(contract.tier)}
            </span>
            <span className={`text-[10px] px-1 py-0.5 rounded ${
              bid.status === 'won' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              bid.status === 'lost' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              bid.status === 'withdrawn' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
              'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
            }`}>
              {bid.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="text-right text-[10px] flex-shrink-0">
          <p className="text-slate-500">Your bid</p>
          <p className="text-white font-mono">{formatShort(bid.bidAmount)}</p>
        </div>
      </div>

      {/* Collateral info */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-2">
        <span>Collateral: <span className="text-amber-400 font-mono">{formatShort(bid.collateralLocked)}</span></span>
        <span>Delivery: <span className="text-slate-300 font-mono">{bid.deliveryPromise ?? '?'}mo</span></span>
        {bid.compositeScore != null && (
          <span>Score: <span className="text-slate-300 font-mono">{bid.compositeScore.toFixed(1)}</span></span>
        )}
      </div>

      {/* Won contract: deadline + actions */}
      {type === 'won' && (
        <div className="space-y-2">
          {contract.deliveryDeadline && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-500">Deadline:</span>
              <span className={`font-mono ${deadlineMs < 3600000 ? 'text-red-400 animate-pulse' : deadlineMs < 7200000 ? 'text-amber-400' : 'text-slate-300'}`}>
                {formatCountdown(deadlineMs)}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClaim}
              disabled={isLoading}
              className="flex-1 py-1.5 text-[10px] font-medium bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
            >
              {isLoading ? '...' : 'Claim Fulfillment'}
            </button>
            <button
              onClick={onAbandon}
              disabled={isLoading}
              className="px-3 py-1.5 text-[10px] font-medium bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors border border-red-500/20"
            >
              Abandon
            </button>
          </div>
        </div>
      )}

      {/* Pending: time until close */}
      {type === 'pending' && (
        <div className="text-[10px] text-slate-500">
          Bidding closes: <span className="text-slate-300 font-mono">
            {formatCountdown(new Date(contract.biddingEndsAt).getTime() - now)}
          </span>
        </div>
      )}

      {/* Result: outcome info */}
      {type === 'result' && bid.status === 'lost' && (
        <div className="text-[10px] text-slate-500">
          Collateral returned to your balance.
          {contract.winningBid && (
            <span className="ml-1">Winning bid: <span className="text-slate-300 font-mono">{formatShort(contract.winningBid)}</span></span>
          )}
        </div>
      )}
    </div>
  );
}
