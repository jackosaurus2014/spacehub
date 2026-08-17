'use client';

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { CONTRACT_POOL, getRequirementProgress, isContractComplete } from '@/lib/game/contracts';
import { formatMoney } from '@/lib/game/formulas';
import { MILESTONES } from '@/lib/game/milestones';
import { playSound } from '@/lib/game/sound-engine';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
// FTUE fix (simulated-newcomer audit 8/16): legacy contract completions now
// count against the SHARED rolling-24h budget (delivery-contracts.ts V40) —
// but this panel never showed it, so a "COMPLETE!" contract that silently
// didn't pay looked broken. Surface the budget and the queued-payout state.
import { getDeliveryCapStatus } from '@/lib/game/delivery-contracts';
import HoloTip, { Concept } from './HoloTip';
import Image from 'next/image';

/** "2h 05m" style formatter for the cap-reset countdown. */
function formatMsShort(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.ceil((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

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

  // Timed competitive events
  const timedEvents = (state.activeTimedEvents || []).filter(e => !e.completed);
  const completedTimedEvents = (state.activeTimedEvents || []).filter(e => e.completed);

  // Shared daily contract budget (delivery-contracts.ts): legacy + delivery
  // completions draw from one rolling-24h pool.
  const capStatus = getDeliveryCapStatus(state);

  return (
    <div className="space-y-6">
      {/* Daily contract budget — shared across Standard + Faction Delivery contracts */}
      <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
        capStatus.atCap ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/[0.06] bg-white/[0.02]'
      }`}>
        <HoloTip
          content={{
            title: 'Daily Contract Budget',
            icon: 'contracts',
            body: (
              <p>
                Contract payouts share one <Concept id="delivery-cap">daily budget</Concept> — Standard
                contracts and Faction Deliveries both draw from it. A finished contract past the cap
                stays active and pays automatically once the rolling 24-hour window frees a slot.
                Raise the cap with Space Logistics Network research and at Corporation Tier 5.
              </p>
            ),
            source: 'delivery-contracts.ts · rolling 24h window',
          }}
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold cursor-help">
            Daily contract budget
          </span>
        </HoloTip>
        <span className={`text-xs font-mono ${capStatus.atCap ? 'text-amber-400' : 'text-slate-300'}`}>
          {capStatus.completed}/{capStatus.cap} used
          {capStatus.atCap && capStatus.resetInMs > 0 && (
            <span className="text-[10px] text-slate-500"> · frees in {formatMsShort(capStatus.resetInMs)}</span>
          )}
          <span className={`text-[10px] ml-1 ${activeIds.length >= capStatus.cap ? 'text-amber-400' : 'text-slate-500'}`}>
            {' '}· active {activeIds.length}/{capStatus.cap}
          </span>
        </span>
      </div>
      {/* Timed Competitive Events */}
      {(timedEvents.length > 0 || completedTimedEvents.length > 0) && (
        <div>
          <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" />
            Timed Events ({timedEvents.length} active)
          </h3>
          <div className="grid gap-2">
            {timedEvents.map(evt => {
              const template = (require('@/lib/game/timed-events') as { EVENT_TEMPLATES: { id: string; getProgress: (s: GameState) => number }[] }).EVENT_TEMPLATES.find((t: { id: string }) => t.id === evt.templateId);
              const progress = template ? template.getProgress(state) : 0;
              const pct = Math.min(100, Math.round((progress / evt.target) * 100));
              const remaining = Math.max(0, evt.expiresAtMs - Date.now());
              const hoursLeft = Math.floor(remaining / 3600000);
              const minsLeft = Math.floor((remaining % 3600000) / 60000);
              return (
                <div key={evt.templateId + evt.startedAtMs} className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{evt.icon} {evt.name}</span>
                    <span className="text-xs text-amber-400 font-mono">{hoursLeft}h {minsLeft}m</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{evt.description}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-zinc-300 font-mono">{progress}/{evt.target}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{evt.targetLabel}</span>
                    <span className="text-emerald-400">+{formatMoney(evt.rewardAmount)}</span>
                  </div>
                </div>
              );
            })}
            {completedTimedEvents.map(evt => (
              <div key={evt.templateId + evt.startedAtMs} className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-300">{evt.icon} {evt.name} — Complete!</span>
                  <span className="text-xs text-emerald-400">+{formatMoney(evt.rewardAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Contracts */}
      {active.length > 0 && (
        <div>
          <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse motion-reduce:animate-none" />
            Active Contracts ({active.length})
          </h3>
          <div className="space-y-3">
            {active.map(contract => {
              const complete = isContractComplete(state, contract);
              return (
                <div key={contract.id} className={`hud-frame relative rounded-xl border p-4 ${complete ? 'hud-frame-amber border-green-500/30 bg-green-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}>
                  <span className="hud-corner-bl" aria-hidden="true" />
                  <span className="hud-corner-br" aria-hidden="true" />
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-lg mr-2">{contract.icon}</span>
                      <span className="text-white text-sm font-semibold">{contract.name}</span>
                      <p className="text-slate-500 text-[10px] mt-0.5">{contract.client}</p>
                    </div>
                    {complete && (capStatus.atCap ? (
                      <span role="status" aria-live="polite" className="text-amber-400 text-[10px] font-bold text-right">
                        PAYOUT QUEUED<br />
                        <span className="font-normal text-amber-400/70">daily budget spent{capStatus.resetInMs > 0 ? ` — frees in ${formatMsShort(capStatus.resetInMs)}` : ''}</span>
                      </span>
                    ) : (
                      <span role="status" aria-live="polite" className="text-green-400 text-xs font-bold">COMPLETE!</span>
                    ))}
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
                            <span className={done ? 'game-number text-green-400' : 'game-number text-slate-500'}>
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
                  <div className="text-[10px] text-slate-500 flex items-center flex-wrap gap-1.5">
                    Reward: <span className="game-number text-green-400">{formatMoney(contract.reward.money || 0)}</span>
                    {contract.reward.resources && Object.entries(contract.reward.resources).map(([r, q]) => (
                      <span key={r} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        {RESOURCE_ASSETS[r] && (
                          <Image src={RESOURCE_ASSETS[r]} alt="" width={12} height={12} className="w-3 h-3 rounded object-cover" />
                        )}
                        {q} {r.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Contracts */}
      <div>
        <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-3">
          Available Contracts
        </h3>
        {available.length === 0 ? (
          <p className="text-slate-500 text-xs">No new contracts available. Complete active contracts to see more.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {available.map(contract => (
              <div key={contract.id} className="hud-frame game-card relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <span className="hud-corner-bl" aria-hidden="true" />
                <span className="hud-corner-br" aria-hidden="true" />
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">{contract.icon}</span>
                  <div>
                    <h4 className="text-white text-sm font-semibold">{contract.name}</h4>
                    <p className="text-slate-600 text-[10px]">{contract.client} · Tier {contract.tier}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mb-2">{contract.description}</p>
                <div className="text-[10px] text-slate-500 mb-3">
                  Reward: <span className="game-number text-green-400">{formatMoney(contract.reward.money || 0)}</span>
                </div>
                {activeIds.length >= capStatus.cap ? (
                  <button
                    disabled
                    className="w-full min-h-[44px] py-1.5 text-xs font-medium bg-white/[0.04] text-slate-500 rounded-lg cursor-not-allowed border border-white/[0.06]"
                    title="Active contract slots full — complete or wait out a contract before accepting more"
                  >
                    Slots full ({activeIds.length}/{capStatus.cap})
                  </button>
                ) : (
                  <button
                    onClick={() => { playSound('click'); onAcceptContract(contract.id); }}
                    className="w-full min-h-[44px] py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                  >
                    Accept Contract
                  </button>
                )}
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
        <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-3">
          🏆 Competitive Milestones
        </h3>
        <div className="space-y-1.5" role="list" aria-label="Competitive milestones">
          {MILESTONES.map(m => {
            const claimed = claimedMilestones[m.id];
            const isPlayer = claimed === (state.companyName || 'Your Company');
            return (
              <div key={m.id} role="listitem" className={`holo-row flex items-center justify-between p-2 rounded-lg ${
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
                    <p className="text-slate-600 text-[11px]">{m.description}</p>
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
