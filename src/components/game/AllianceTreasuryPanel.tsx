'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivePerk {
  id: string;
  perkId: string;
  name: string;
  description: string;
  bonusType: string;
  bonusValue: number;
  activatedAt: number;
  expiresAt: number;
  remainingMs: number;
}

interface PerkCatalogItem {
  perkId: string;
  name: string;
  icon: string;
  description: string;
  bonusType: string;
  bonusValue: number;
  treasuryCost: number;
  durationHours: number;
  minLevel: number;
  canActivate: boolean;
  isActive: boolean;
}

interface LogEntry {
  type: string;
  actorName: string | null;
  title: string;
  metadata: Record<string, unknown> | null;
  createdAt: number;
}

interface TreasuryData {
  treasury: number;
  allianceLevel: number;
  activePerks: ActivePerk[];
  perkCatalog: PerkCatalogItem[];
  recentLogs: LogEntry[];
  canManage: boolean;
  perkBonuses: Record<string, number>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllianceTreasuryPanel() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'perks' | 'shop' | 'log'>('perks');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliance-treasury');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(err.error || 'Failed to load treasury');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load treasury');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDeposit = useCallback(async () => {
    if (actionLoading) return;
    const amount = parseInt(depositAmount, 10);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deposit', amount }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('money');
        setDepositAmount('');
        await fetchData();
      } else {
        setError(result.error || 'Deposit failed');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, depositAmount, fetchData]);

  const handleActivatePerk = useCallback(async (perkId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_perk', perkId }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('milestone');
        await fetchData();
      } else {
        setError(result.error || 'Failed to activate perk');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading treasury...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-red-400 text-xs mb-2">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-4 py-1.5 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { treasury, allianceLevel, activePerks, perkCatalog, recentLogs, canManage } = data;
  const levelGated = allianceLevel < 8;

  return (
    <div className="space-y-4">
      {/* Treasury Balance */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-300/70 text-[10px] font-bold uppercase tracking-wider mb-1">Alliance Treasury</p>
            <p className="text-amber-300 text-2xl font-bold font-mono">{formatMoney(treasury)}</p>
          </div>
          <span className="text-3xl">🏦</span>
        </div>

        {/* Deposit Section */}
        <div className="mt-3 pt-3 border-t border-amber-500/10">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount to deposit..."
              min={0}
              className="flex-1 h-8 px-3 rounded-lg bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-amber-500/30 placeholder-slate-600 font-mono"
            />
            <button
              onClick={handleDeposit}
              disabled={actionLoading || !depositAmount}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {actionLoading ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
        </div>
      </div>

      {/* Level Gate Warning */}
      {levelGated && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-amber-300 text-xs font-semibold">Alliance Level 8 Required</p>
            <p className="text-slate-500 text-[10px]">
              Perk activation requires your alliance to reach Level 8. Current level: {allianceLevel}.
            </p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/[0.06]">
        {(['perks', 'shop', 'log'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
              activeTab === t
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}
          >
            {t === 'perks' ? `Active (${activePerks.length})` : t === 'shop' ? 'Perk Shop' : 'Log'}
          </button>
        ))}
      </div>

      {/* Active Perks */}
      {activeTab === 'perks' && (
        <>
          {activePerks.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <span className="text-2xl block mb-2">✨</span>
              <p className="text-slate-400 text-xs">No active perks.</p>
              <p className="text-slate-600 text-[10px] mt-1">Activate perks from the Shop tab to boost your alliance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activePerks.map(perk => (
                <div
                  key={perk.id}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <h4 className="text-white text-xs font-semibold">{perk.name}</h4>
                        <span className="text-amber-300 text-[10px] font-mono font-bold">+{Math.round(perk.bonusValue * 100)}% {perk.bonusType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      {perk.description}
                    </span>
                    <span className="text-amber-300 font-mono">
                      {formatTimeRemaining(perk.remainingMs)}
                    </span>
                  </div>
                  {/* Timer bar */}
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, (perk.remainingMs / (24 * 60 * 60 * 1000)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Perk Shop */}
      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {perkCatalog.map(perk => (
            <div
              key={perk.perkId}
              className={`rounded-xl border p-3 transition-colors ${
                perk.isActive
                  ? 'border-green-500/20 bg-green-500/5'
                  : perk.canActivate && !actionLoading
                    ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30'
                    : 'border-white/[0.06] bg-white/[0.02] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{perk.icon}</span>
                  <h4 className="text-white text-xs font-semibold">{perk.name}</h4>
                </div>
                <span className="text-amber-300 text-[10px] font-mono font-bold">+{Math.round(perk.bonusValue * 100)}%</span>
              </div>

              <p className="text-slate-400 text-[10px] mb-2">{perk.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`font-mono ${treasury >= perk.treasuryCost ? 'text-amber-300' : 'text-red-400'}`}>
                    {formatMoney(perk.treasuryCost)}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-500">{perk.durationHours}h</span>
                </div>

                {perk.isActive ? (
                  <span className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-bold">
                    ACTIVE
                  </span>
                ) : allianceLevel < perk.minLevel ? (
                  <span className="text-[10px] text-slate-600">
                    Lv.{perk.minLevel} required
                  </span>
                ) : (
                  <button
                    onClick={() => handleActivatePerk(perk.perkId)}
                    disabled={!perk.canActivate || actionLoading}
                    className="px-3 py-1 text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Log */}
      {activeTab === 'log' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📜</span> Transaction History
          </h3>
          {recentLogs.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No transactions yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto game-scroll">
              {recentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {log.type === 'treasury_deposit' ? '📥' : log.type === 'perk_activated' ? '✨' : '📤'}
                    </span>
                    <div>
                      <p className="text-white text-xs">{log.title}</p>
                      <p className="text-slate-600 text-[9px]">
                        {log.actorName ?? 'System'} &middot; {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    log.type === 'treasury_deposit' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {log.type === 'treasury_deposit' ? '+' : '-'}
                    {log.metadata && typeof log.metadata === 'object' && 'amount' in log.metadata
                      ? formatMoney(Number(log.metadata.amount))
                      : log.metadata && typeof log.metadata === 'object' && 'cost' in log.metadata
                        ? formatMoney(Number(log.metadata.cost))
                        : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-center">
          <p className="text-red-400 text-[10px]">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
