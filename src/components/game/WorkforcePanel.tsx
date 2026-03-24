'use client';

import type { GameState } from '@/lib/game/types';
import { WORKER_TYPES, getMonthlyPayroll, getWorkforceBonuses, getHireCost, getCrewCapacity, canHireWorker } from '@/lib/game/workforce';
import type { WorkerType } from '@/lib/game/workforce';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface WorkforcePanelProps {
  state: GameState;
  onHire: (workerType: string) => void;
  onDismiss?: (workerType: string) => void;
}

export default function WorkforcePanel({ state, onHire, onDismiss }: WorkforcePanelProps) {
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const payroll = getMonthlyPayroll(workforce);
  const bonuses = getWorkforceBonuses(workforce);
  const totalWorkers = workforce.engineers + workforce.scientists + workforce.miners + workforce.operators;
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const capacity = getCrewCapacity(completedBuildings, state.unlockedLocations.length, state.completedResearch.length);

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
          <p className="text-cyan-400 text-lg font-bold">{totalWorkers}</p>
          <p className="text-slate-500 text-xs">Total Crew</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-red-400 text-lg font-bold">{formatMoney(payroll)}</p>
          <p className="text-slate-500 text-xs">Monthly Payroll</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
          <p className="text-green-400 text-lg font-bold">+{Math.round(bonuses.serviceRevenue * 100)}%</p>
          <p className="text-slate-500 text-xs">Revenue Bonus</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-amber-400 text-lg font-bold">+{Math.round(bonuses.miningOutput * 100)}%</p>
          <p className="text-slate-500 text-xs">Mining Bonus</p>
        </div>
      </div>

      {/* Active Bonuses */}
      {totalWorkers > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-white text-xs font-bold mb-2">Active Workforce Bonuses</p>
          <div className="flex flex-wrap gap-2">
            {bonuses.buildSpeed > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Build Speed +{Math.round(bonuses.buildSpeed * 100)}%
              </span>
            )}
            {bonuses.researchSpeed > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Research +{Math.round(bonuses.researchSpeed * 100)}%
              </span>
            )}
            {bonuses.miningOutput > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Mining +{Math.round(bonuses.miningOutput * 100)}%
              </span>
            )}
            {bonuses.serviceRevenue > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                Revenue +{Math.round(bonuses.serviceRevenue * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Crew Capacity */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-xs font-bold uppercase tracking-wider">Crew Capacity</span>
          <span className="text-cyan-400 text-xs font-mono">{totalWorkers}/{capacity.total}</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.min(100, (totalWorkers / Math.max(1, capacity.total)) * 100)}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {capacity.breakdown.map(b => (
            <span key={b.source} className="text-zinc-500 text-[9px]">+{b.amount} from {b.source}</span>
          ))}
        </div>
      </div>

      {/* Hire Workers */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Hire Crew</h3>
        <div className="space-y-3">
          {WORKER_TYPES.map(worker => {
            const count = workforce[`${worker.type}s` as keyof typeof workforce] || 0;
            const hireCost = getHireCost(worker.type);
            const canAfford = state.money >= hireCost;
            const hireCheck = canHireWorker(workforce, worker.type as WorkerType, completedBuildings, state.unlockedLocations.length, state.completedResearch.length);
            const canHire = canAfford && hireCheck.allowed;

            return (
              <div key={worker.type} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{worker.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{worker.name}</span>
                      <span className="text-cyan-400 text-xs font-mono">{count} hired</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">{worker.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-slate-600 text-[9px]">Salary: {formatMoney(worker.salary)}/mo</span>
                      <span className="text-slate-600 text-[9px]">·</span>
                      <span className="text-slate-600 text-[9px]">Hire cost: {formatMoney(hireCost)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => { if (canHire) { playSound('click'); onHire(worker.type); } }}
                    disabled={!canHire}
                    title={!hireCheck.allowed ? hireCheck.reason : !canAfford ? 'Insufficient funds' : undefined}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      canHire
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                        : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {!hireCheck.allowed ? 'Full' : `Hire ${formatMoney(hireCost)}`}
                  </button>
                  {onDismiss && count > 0 && (
                    <button
                      onClick={() => { playSound('click'); onDismiss(worker.type); }}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      Dismiss
                    </button>
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
