'use client';

import { useState, useEffect, useCallback } from 'react';
import { playSound } from '@/lib/game/sound-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

type DiplomacyType = 'trade_agreement' | 'non_aggression' | 'alliance_pact' | 'war';
type WarObjective = 'zone_control' | 'economic_dominance' | 'event_supremacy';

interface DiplomacyRecord {
  id: string;
  type: string;
  status: string;
  partnerAllianceId: string;
  partnerAllianceName: string;
  partnerAllianceTag: string;
  tradeBonus: number | null;
  warScore: { senderScore: number; receiverScore: number } | null;
  warObjective: string | null;
  startsAt: number | null;
  endsAt: number | null;
  remainingMs: number;
  isSender: boolean;
}

interface AllianceListing {
  id: string;
  name: string;
  tag: string;
  level: number;
  memberCount: number;
}

interface DiplomacyData {
  allianceLevel: number;
  warRecord: { wins: number; losses: number };
  active: DiplomacyRecord[];
  pending: DiplomacyRecord[];
  diplomacyBonuses: { tradeBonus: number; zoneBonus: number; espionageProtection: boolean };
  treatyDefinitions: Array<{ type: string; name: string; description: string; durationDays: number; maxActive: number; minLevel: number }>;
  warDefinition: { durationDays: number; minLevel: number; objectives: string[] };
  otherAlliances: AllianceListing[];
  canManage: boolean;
}

const TREATY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  trade_agreement: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-300', badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
  alliance_pact: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  non_aggression: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
};

const TREATY_LABELS: Record<string, string> = {
  trade_agreement: 'Trade Agreement',
  alliance_pact: 'Alliance Pact',
  non_aggression: 'Non-Aggression',
};

const TREATY_ICONS: Record<string, string> = {
  trade_agreement: '💹',
  alliance_pact: '🛡️',
  non_aggression: '🕊️',
};

const TREATY_TYPES: DiplomacyType[] = ['trade_agreement', 'non_aggression', 'alliance_pact'];

const WAR_OBJECTIVE_LABELS: Record<string, string> = {
  zone_control: 'Zone Control',
  economic_dominance: 'Economic Dominance',
  event_supremacy: 'Event Supremacy',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllianceDiplomacyPanel() {
  const [data, setData] = useState<DiplomacyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Propose treaty modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeTarget, setProposeTarget] = useState('');
  const [proposeType, setProposeType] = useState<DiplomacyType>('trade_agreement');
  const [proposeMessage, setProposeMessage] = useState('');

  // Declare war modal
  const [showWarModal, setShowWarModal] = useState(false);
  const [warTarget, setWarTarget] = useState('');
  const [warObjective, setWarObjective] = useState<WarObjective>('zone_control');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/alliance-diplomacy');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(err.error || 'Failed to load diplomacy');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diplomacy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleProposeTreaty = useCallback(async () => {
    if (actionLoading || !proposeTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-diplomacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAllianceId: proposeTarget,
          type: proposeType,
        }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('milestone');
        setShowProposeModal(false);
        setProposeTarget('');
        setProposeMessage('');
        await fetchData();
      } else {
        setError(result.error || 'Failed to propose treaty');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, proposeTarget, proposeType, fetchData]);

  const handleRespondProposal = useCallback(async (proposalId: string, accept: boolean) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-diplomacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diplomacyId: proposalId,
          accept,
        }),
      });
      const result = await res.json();
      if (result.success) {
        playSound(accept ? 'build_complete' : 'click');
        await fetchData();
      } else {
        setError(result.error || 'Action failed');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, fetchData]);

  const handleDeclareWar = useCallback(async () => {
    if (actionLoading || !warTarget) return;
    if (!confirm('Are you sure you want to declare war? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/alliance-diplomacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAllianceId: warTarget,
          type: 'war' as DiplomacyType,
          warObjective,
        }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('milestone');
        setShowWarModal(false);
        setWarTarget('');
        await fetchData();
      } else {
        setError(result.error || 'Failed to declare war');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setActionLoading(false);
  }, [actionLoading, warTarget, warObjective, fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading diplomacy...</p>
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

  const { active, pending, allianceLevel, otherAlliances, canManage } = data;

  // Separate active records into treaties and wars
  const treaties = active.filter(d => d.type !== 'war');
  const activeWar = active.find(d => d.type === 'war') ?? null;
  const isLeaderOrOfficer = canManage;
  const canDeclareWar = allianceLevel >= 30;

  // Pending proposals: incoming (we are receiver, i.e., not sender) vs outgoing (we are sender)
  const incomingProposals = pending.filter(p => !p.isSender);
  const outgoingProposals = pending.filter(p => p.isSender);

  return (
    <div className="space-y-4">
      {/* Active War Banner */}
      {activeWar && (
        <div className="rounded-xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/10 to-amber-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              <div>
                <h3 className="text-red-300 text-sm font-bold uppercase tracking-wider">War Active</h3>
                <p className="text-slate-400 text-[10px]">
                  vs [{activeWar.partnerAllianceTag}] {activeWar.partnerAllianceName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-amber-300 text-xs font-mono font-bold">{formatTimeRemaining(activeWar.remainingMs)}</p>
              <p className="text-slate-500 text-[10px]">remaining</p>
            </div>
          </div>

          {/* Objective */}
          {activeWar.warObjective && (
            <div className="text-center mb-3">
              <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold uppercase">
                {WAR_OBJECTIVE_LABELS[activeWar.warObjective] ?? activeWar.warObjective}
              </span>
            </div>
          )}

          {/* Score Bars */}
          {activeWar.warScore && (
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-green-300 text-[10px] font-semibold">Our Alliance</span>
                  <span className="text-green-300 text-xs font-mono font-bold">
                    {(activeWar.isSender ? activeWar.warScore.senderScore : activeWar.warScore.receiverScore).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((activeWar.isSender ? activeWar.warScore.senderScore : activeWar.warScore.receiverScore) / 1000) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-red-300 text-[10px] font-semibold">[{activeWar.partnerAllianceTag}]</span>
                  <span className="text-red-300 text-xs font-mono font-bold">
                    {(activeWar.isSender ? activeWar.warScore.receiverScore : activeWar.warScore.senderScore).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((activeWar.isSender ? activeWar.warScore.receiverScore : activeWar.warScore.senderScore) / 1000) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Treaties */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span>📜</span> Active Treaties ({treaties.length})
          </h3>
          {isLeaderOrOfficer && (
            <button
              onClick={() => setShowProposeModal(true)}
              className="px-3 py-1 text-[10px] font-semibold text-green-300 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-lg transition-colors"
            >
              + Propose Treaty
            </button>
          )}
        </div>

        {treaties.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">
            No active treaties. Propose one to establish diplomatic relations.
          </p>
        ) : (
          <div className="space-y-2">
            {treaties.map(treaty => {
              const tc = TREATY_COLORS[treaty.type] ?? TREATY_COLORS.trade_agreement;
              return (
                <div
                  key={treaty.id}
                  className={`rounded-lg ${tc.bg} border ${tc.border} p-3`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{TREATY_ICONS[treaty.type] ?? '📜'}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-xs font-semibold">{treaty.partnerAllianceName}</span>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.06] text-slate-400 font-mono">
                            [{treaty.partnerAllianceTag}]
                          </span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${tc.badge}`}>
                          {TREATY_LABELS[treaty.type] ?? treaty.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono ${tc.text}`}>
                        {formatTimeRemaining(treaty.remainingMs)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Proposals */}
      {(incomingProposals.length > 0 || outgoingProposals.length > 0) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>📨</span> Pending Proposals ({pending.length})
          </h3>

          {/* Incoming */}
          {incomingProposals.length > 0 && (
            <div className="mb-3">
              <p className="text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-2">Incoming</p>
              <div className="space-y-2">
                {incomingProposals.map(p => {
                  const tc = TREATY_COLORS[p.type] ?? TREATY_COLORS.trade_agreement;
                  return (
                    <div key={p.id} className={`rounded-lg ${tc.bg} border ${tc.border} p-3`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{TREATY_ICONS[p.type] ?? '📜'}</span>
                          <div>
                            <span className="text-white text-xs font-semibold">[{p.partnerAllianceTag}] {p.partnerAllianceName}</span>
                            <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${tc.badge}`}>
                              {TREATY_LABELS[p.type] ?? p.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isLeaderOrOfficer && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondProposal(p.id, true)}
                            disabled={actionLoading}
                            className="px-3 py-1 text-[10px] font-semibold text-green-300 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondProposal(p.id, false)}
                            disabled={actionLoading}
                            className="px-3 py-1 text-[10px] font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outgoing */}
          {outgoingProposals.length > 0 && (
            <div>
              <p className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">Outgoing</p>
              <div className="space-y-2">
                {outgoingProposals.map(p => {
                  const tc = TREATY_COLORS[p.type] ?? TREATY_COLORS.trade_agreement;
                  return (
                    <div key={p.id} className={`rounded-lg bg-white/[0.03] border border-white/[0.06] p-3`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{TREATY_ICONS[p.type] ?? '📜'}</span>
                        <div>
                          <span className="text-white text-xs">[{p.partnerAllianceTag}] {p.partnerAllianceName}</span>
                          <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${tc.badge}`}>
                            {TREATY_LABELS[p.type] ?? p.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-500 text-[10px] mt-1">Awaiting response...</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isLeaderOrOfficer && !activeWar && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowProposeModal(true)}
            className="flex-1 py-2 text-xs font-semibold text-green-300 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-lg transition-colors"
          >
            🕊️ Propose Treaty
          </button>
          {canDeclareWar ? (
            <button
              onClick={() => setShowWarModal(true)}
              className="flex-1 py-2 text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              ⚔️ Declare War
            </button>
          ) : (
            <div className="flex-1 py-2 text-xs text-center text-slate-600 bg-white/[0.02] border border-white/[0.04] rounded-lg flex items-center justify-center gap-1">
              <span>🔒</span> War (Lv.30+)
            </div>
          )}
        </div>
      )}

      {/* Propose Treaty Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-green-500/20 bg-[#0a0a14] p-5">
            <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
              <span>🕊️</span> Propose Treaty
            </h3>

            {/* Target Alliance */}
            <div className="mb-3">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Target Alliance
              </label>
              <select
                value={proposeTarget}
                onChange={(e) => setProposeTarget(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-green-500/30"
              >
                <option value="">Select alliance...</option>
                {otherAlliances.map(a => (
                  <option key={a.id} value={a.id}>[{a.tag}] {a.name} (Lv.{a.level})</option>
                ))}
              </select>
            </div>

            {/* Treaty Type */}
            <div className="mb-4">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Treaty Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TREATY_TYPES.map(type => {
                  const tc = TREATY_COLORS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setProposeType(type)}
                      className={`p-2 rounded-lg border text-[10px] font-semibold transition-colors ${
                        proposeType === type
                          ? `${tc.bg} ${tc.border} ${tc.text}`
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-white'
                      }`}
                    >
                      {TREATY_ICONS[type]} {TREATY_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleProposeTreaty}
                disabled={actionLoading || !proposeTarget}
                className="flex-1 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {actionLoading ? 'Sending...' : 'Send Proposal'}
              </button>
              <button
                onClick={() => setShowProposeModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declare War Modal */}
      {showWarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-[#0a0a14] p-5">
            <h3 className="text-red-300 text-sm font-bold mb-4 flex items-center gap-2">
              <span>⚔️</span> Declare War
            </h3>

            {/* Target Alliance */}
            <div className="mb-3">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                Target Alliance
              </label>
              <select
                value={warTarget}
                onChange={(e) => setWarTarget(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-white/[0.06] text-white text-xs border border-white/[0.06] focus:outline-none focus:border-red-500/30"
              >
                <option value="">Select alliance...</option>
                {otherAlliances.map(a => (
                  <option key={a.id} value={a.id}>[{a.tag}] {a.name} (Lv.{a.level})</option>
                ))}
              </select>
            </div>

            {/* War Objective */}
            <div className="mb-4">
              <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1">
                War Objective
              </label>
              <div className="space-y-2">
                {(Object.keys(WAR_OBJECTIVE_LABELS) as WarObjective[]).map(obj => (
                  <button
                    key={obj}
                    onClick={() => setWarObjective(obj)}
                    className={`w-full p-2.5 rounded-lg border text-left text-[10px] font-semibold transition-colors ${
                      warObjective === obj
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-white'
                    }`}
                  >
                    {WAR_OBJECTIVE_LABELS[obj]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-2 mb-4">
              <p className="text-red-400 text-[10px]">
                Warning: Declaring war will end all treaties with the target alliance and cannot be undone until the war ends.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeclareWar}
                disabled={actionLoading || !warTarget}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {actionLoading ? 'Declaring...' : 'Declare War'}
              </button>
              <button
                onClick={() => setShowWarModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
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
