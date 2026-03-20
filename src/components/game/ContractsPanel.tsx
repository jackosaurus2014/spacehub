'use client';

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { CONTRACT_POOL, getRequirementProgress, isContractComplete } from '@/lib/game/contracts';
import { formatMoney } from '@/lib/game/formulas';
import { MILESTONES } from '@/lib/game/milestones';
import { playSound } from '@/lib/game/sound-engine';

interface ContractsPanelProps {
  state: GameState;
  onAcceptContract: (contractId: string) => void;
}

export default function ContractsPanel({ state, onAcceptContract }: ContractsPanelProps) {
  const playerTier = Math.max(1, Math.floor(state.completedResearch.length / 5) + 1);
  const completedIds = state.completedContracts || [];
  const activeIds = state.activeContracts || [];

  const available = useMemo(() => {
    return CONTRACT_POOL.filter(c =>
      c.tier <= Math.min(playerTier, 3) &&
      !completedIds.includes(c.id) &&
      !activeIds.includes(c.id)
    ).slice(0, 4);
  }, [playerTier, completedIds, activeIds]);

  const active = useMemo(() => {
    return CONTRACT_POOL.filter(c => activeIds.includes(c.id));
  }, [activeIds]);

  // Milestones
  const claimedMilestones = state.claimedMilestones || {};

  return (
    <div className="space-y-6">
      {/* Active Contracts */}
      {active.length > 0 && (
        <div>
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Active Contracts ({active.length})
          </h3>
          <div className="space-y-3">
            {active.map(contract => {
              const complete = isContractComplete(state, contract);
              return (
                <div key={contract.id} className={`rounded-xl border p-4 ${complete ? 'border-green-500/30 bg-green-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-lg mr-2">{contract.icon}</span>
                      <span className="text-white text-sm font-semibold">{contract.name}</span>
                      <p className="text-slate-500 text-[10px] mt-0.5">{contract.client}</p>
                    </div>
                    {complete && <span className="text-green-400 text-xs font-bold">COMPLETE!</span>}
                  </div>
                  <p className="text-slate-400 text-xs mb-3">{contract.description}</p>
                  {/* Requirements with progress */}
                  <div className="space-y-1.5 mb-3">
                    {contract.requirements.map((req, i) => {
                      const progress = getRequirementProgress(state, req);
                      const pct = Math.min(100, (progress / req.target) * 100);
                      const done = progress >= req.target;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className={done ? 'text-green-400' : 'text-slate-400'}>{req.label}</span>
                            <span className={done ? 'text-green-400 font-mono' : 'text-slate-500 font-mono'}>
                              {typeof progress === 'number' && progress >= 1000 ? formatMoney(progress) : progress}/{typeof req.target === 'number' && req.target >= 1000 ? formatMoney(req.target) : req.target}
                            </span>
                          </div>
                          <div className="h-1 bg-white/[0.06] rounded-full">
                            <div className={`h-1 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-cyan-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Reward: <span className="text-green-400">{formatMoney(contract.reward.money || 0)}</span>
                    {contract.reward.resources && Object.keys(contract.reward.resources).length > 0 && (
                      <span className="text-amber-400 ml-2">
                        + {Object.entries(contract.reward.resources).map(([r, q]) => `${q} ${r.replace(/_/g, ' ')}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Contracts */}
      <div>
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
          Available Contracts
        </h3>
        {available.length === 0 ? (
          <p className="text-slate-500 text-xs">No new contracts available. Complete active contracts to see more.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {available.map(contract => (
              <div key={contract.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">{contract.icon}</span>
                  <div>
                    <h4 className="text-white text-sm font-semibold">{contract.name}</h4>
                    <p className="text-slate-600 text-[10px]">{contract.client} · Tier {contract.tier}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mb-2">{contract.description}</p>
                <div className="text-[10px] text-slate-500 mb-3">
                  Reward: <span className="text-green-400">{formatMoney(contract.reward.money || 0)}</span>
                </div>
                <button
                  onClick={() => { playSound('click'); onAcceptContract(contract.id); }}
                  className="w-full py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                >
                  Accept Contract
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Contracts */}
      {completedIds.length > 0 && (
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Completed ({completedIds.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            {completedIds.map(id => {
              const c = CONTRACT_POOL.find(x => x.id === id);
              return c ? (
                <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {c.icon} {c.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Competitive Milestones */}
      <div>
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
          🏆 Competitive Milestones
        </h3>
        <div className="space-y-1.5">
          {MILESTONES.map(m => {
            const claimed = claimedMilestones[m.id];
            const isPlayer = claimed === (state.companyName || 'Your Company');
            return (
              <div key={m.id} className={`flex items-center justify-between p-2 rounded-lg ${
                claimed
                  ? isPlayer ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
                  : 'bg-white/[0.02] border border-white/[0.04]'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{m.icon}</span>
                  <div>
                    <span className={`text-xs font-medium ${claimed ? isPlayer ? 'text-green-400' : 'text-red-400/70' : 'text-white'}`}>
                      {m.name}
                    </span>
                    <p className="text-slate-600 text-[9px]">{m.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  {claimed ? (
                    <span className={`text-[10px] ${isPlayer ? 'text-green-400' : 'text-red-400/60'}`}>
                      {isPlayer ? '✓ You' : `🤖 ${claimed}`}
                    </span>
                  ) : (
                    <span className="text-slate-600 text-[10px]">{formatMoney(m.reward)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
