'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GameState } from '@/lib/game/types';
import { WORKER_TYPES, getMonthlyPayroll, getWorkforceBonuses, getHireCost, getCrewCapacity, canHireWorker } from '@/lib/game/workforce';
import type { WorkerType } from '@/lib/game/workforce';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { getLegacyBonuses, DEFAULT_LEGACY } from '@/lib/game/legacy-system';
import { buildCareerCrossoverLine } from '@/lib/game/career-crossover';

interface WorkforcePanelProps {
  state: GameState;
  onHire: (workerType: string) => void;
  onDismiss?: (workerType: string) => void;
  onUpdateTrainingBudget?: (perCrewPerMonth: number) => void;
}

// ─── Career crossover — real-world job count ─────────────────────────────────
// Module-level cache shared across mounts/tab-switches so re-opening this
// panel within the hour doesn't refetch. Backed by /api/widgets/jobs, which
// counts real SpaceJobPosting rows (isActive: true) and is itself cached at
// the edge for an hour — this just mirrors that TTL client-side.
let jobCountCache: { count: number; fetchedAt: number } | null = null;
const JOB_COUNT_TTL_MS = 60 * 60 * 1000; // 1h

/** Live active job-posting count for the career-crossover footer. Returns
 *  null until a real count is known — the footer stays hidden until then,
 *  and stays hidden on any fetch failure (never a stale/fabricated number). */
function useLiveJobCount(): number | null {
  const [count, setCount] = useState<number | null>(
    jobCountCache && Date.now() - jobCountCache.fetchedAt < JOB_COUNT_TTL_MS ? jobCountCache.count : null
  );

  useEffect(() => {
    if (jobCountCache && Date.now() - jobCountCache.fetchedAt < JOB_COUNT_TTL_MS) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/widgets/jobs', { signal: controller.signal });
        if (!res.ok) throw new Error(`bad status ${res.status}`);
        const data = await res.json();
        const total = typeof data?.totalActive === 'number' ? data.totalActive : null;
        if (total !== null && total > 0) {
          jobCountCache = { count: total, fetchedAt: Date.now() };
          setCount(total);
        } else {
          jobCountCache = null;
          setCount(null);
        }
      } catch {
        jobCountCache = null;
        setCount(null);
      }
    })();
    return () => controller.abort();
  }, []);

  return count;
}

/** Subtle footer: "Your corporation is hiring in {year}. In the real world,
 *  {N} space-industry jobs are open right now →" linking to /space-talent.
 *  N is always the live count — never hardcoded. Renders nothing until a
 *  real count is available. */
function CareerCrossoverFooter() {
  const jobCount = useLiveJobCount();
  const line = buildCareerCrossoverLine(jobCount);
  if (!line) return null;

  return (
    <Link
      href="/space-talent"
      className="group flex items-center gap-2 px-1 py-2 text-slate-500 hover:text-cyan-300 transition-colors"
    >
      <span className="game-label !text-cyan-500/60 shrink-0" aria-hidden="true">Career Crossover</span>
      <span className="flex-1 min-w-0 truncate text-[11px] normal-case tracking-normal font-normal text-slate-500 group-hover:text-cyan-300">
        {line}
      </span>
      <span aria-hidden="true" className="shrink-0 text-xs group-hover:translate-x-0.5 transition-transform">→</span>
    </Link>
  );
}

export default function WorkforcePanel({ state, onHire, onDismiss, onUpdateTrainingBudget }: WorkforcePanelProps) {
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const payroll = getMonthlyPayroll(workforce);
  const bonuses = getWorkforceBonuses(workforce);
  const totalWorkers =
    workforce.engineers + workforce.scientists + workforce.miners + workforce.operators
    + (workforce.pilots || 0) + (workforce.negotiators || 0)
    + (workforce.securitys || 0) + (workforce.medics || 0);
  const morale = workforce.morale ?? 0.8;
  const fatigue = workforce.fatigue ?? 0;
  const training = workforce.trainingLevel ?? 0.5;
  const trainingBudget = workforce.trainingBudgetPerCrew ?? 0;
  const monthlyTrainingCost = totalWorkers * trainingBudget;
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const legacyBonusCrew = getLegacyBonuses(state.legacy || DEFAULT_LEGACY).bonusCrewCapacity;
  const capacity = getCrewCapacity(completedBuildings, state.unlockedLocations.length, state.completedResearch.length, legacyBonusCrew);
  const now = Date.now();
  const headhuntVoucher = (state.activeIntelPerks || []).find(
    p => p.type === 'headhunt_voucher' && p.expiresAtMs > now
  );
  const headhuntMinutesLeft = headhuntVoucher ? Math.max(0, Math.ceil((headhuntVoucher.expiresAtMs - now) / 60000)) : 0;

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="hud-frame relative flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">👷</span>
          <span className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-medium">Crew Roster</span>
        </div>
        <span className="text-[10px] text-slate-500">Hire, train, and retain your workforce</span>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="hud-frame relative rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <p className="game-number text-cyan-400 text-lg">{totalWorkers}</p>
          <p className="game-label">Total Crew</p>
        </div>
        <div className="hud-frame relative rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <p className="game-number text-red-400 text-lg">{formatMoney(payroll)}</p>
          <p className="game-label">Monthly Payroll</p>
        </div>
        <div className="hud-frame relative rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <p className="game-number text-green-400 text-lg">+{Math.round(bonuses.serviceRevenue * 100)}%</p>
          <p className="game-label">Revenue Bonus</p>
        </div>
        <div className="hud-frame hud-frame-amber relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <p className="game-number text-amber-400 text-lg">+{Math.round(bonuses.miningOutput * 100)}%</p>
          <p className="game-label">Mining Bonus</p>
        </div>
      </div>

      {/* Crew health (Phase III) — morale, fatigue, training level */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="font-hud text-white text-xs font-bold mb-2 uppercase tracking-wider">Crew Health</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <CrewStatBar
            label="Morale"
            value={morale}
            max={1.2}
            good={morale >= 0.9}
            help="Global output multiplier. >0.8 is a boost, <0.8 is a drag on all service revenue."
            color="emerald"
            display={`${(morale * 100).toFixed(0)}%`}
          />
          <CrewStatBar
            label="Fatigue"
            value={fatigue}
            max={1}
            good={fatigue < 0.3}
            help="Accumulates during high-workload months. Halves per-worker bonuses when at max."
            color="amber"
            display={`${(fatigue * 100).toFixed(0)}%`}
            invert
          />
          <CrewStatBar
            label="Training"
            value={training}
            max={1}
            good={training >= 0.7}
            help="(0.5 + training) scales per-worker bonus magnitudes. Budget training to grow it."
            color="sky"
            display={`${(training * 100).toFixed(0)}%`}
          />
        </div>
        {onUpdateTrainingBudget && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="training-budget-slider" className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Training Budget
              </label>
              <span className="text-xs font-mono font-bold text-sky-300">
                {formatMoney(trainingBudget)}/crew/mo
              </span>
            </div>
            <input
              id="training-budget-slider"
              type="range"
              min={0}
              max={1_000_000}
              step={50_000}
              value={trainingBudget}
              onChange={(e) => onUpdateTrainingBudget(Number(e.target.value))}
              aria-valuetext={`${formatMoney(trainingBudget)} per crew member per month`}
              className="w-full accent-sky-500"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-slate-500 text-[10px]">
                Higher training budget raises your crew&apos;s Training Level over time, unlocking workforce bonuses. Charged monthly per crew member.
              </p>
              <span className="text-slate-400 text-[10px] font-mono shrink-0 ml-2">
                Total: {formatMoney(monthlyTrainingCost)}/mo
              </span>
            </div>
          </div>
        )}
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
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 mb-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center justify-between mb-2">
          <span className="game-label !text-white">Crew Capacity</span>
          <span className="game-number text-cyan-400 text-xs">{totalWorkers}/{capacity.total}</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.min(100, (totalWorkers / Math.max(1, capacity.total)) * 100)}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {capacity.breakdown.map(b => (
            <span key={b.source} className="text-zinc-500 text-[10px]">+{b.amount} from {b.source}</span>
          ))}
        </div>
      </div>

      {/* Hire Workers */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider">Hire Crew</h3>
          {headhuntVoucher && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
              <span aria-hidden="true">🕵️</span>
              Headhunt intel active: −{Math.round(headhuntVoucher.discount * 100)}% next hire — expires in {headhuntMinutesLeft}m
            </span>
          )}
        </div>
        <div className="space-y-3">
          {WORKER_TYPES.map(worker => {
            const count = workforce[`${worker.type}s` as keyof typeof workforce] || 0;
            const hireCost = getHireCost(worker.type);
            const canAfford = state.money >= hireCost;
            const hireCheck = canHireWorker(workforce, worker.type as WorkerType, completedBuildings, state.unlockedLocations.length, state.completedResearch.length, legacyBonusCrew);
            const canHire = canAfford && hireCheck.allowed;

            return (
              <div key={worker.type} className="holo-row flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{worker.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{worker.name}</span>
                      <span className="game-number text-cyan-400 text-xs">{count} hired</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">{worker.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-slate-600 text-[10px]">Salary: {formatMoney(worker.salary)}/mo</span>
                      <span className="text-slate-600 text-[10px]">·</span>
                      <span className="text-slate-600 text-[10px]">Hire cost: {formatMoney(hireCost)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => { if (canHire) { playSound('click'); onHire(worker.type); } }}
                    disabled={!canHire}
                    title={!hireCheck.allowed ? hireCheck.reason : !canAfford ? 'Insufficient funds' : undefined}
                    className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                      aria-label={`Dismiss a ${worker.name}`}
                      className="min-h-[44px] px-3 py-1.5 rounded-lg text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
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

      {/* Real-world career crossover — subtle, honest live count, never a banner. */}
      <CareerCrossoverFooter />
    </div>
  );
}

function CrewStatBar({
  label, value, max, good, help, color, display, invert = false,
}: {
  label: string;
  value: number;
  max: number;
  good: boolean;
  help: string;
  color: 'emerald' | 'amber' | 'sky';
  display: string;
  invert?: boolean;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const fillColor = {
    emerald: invert ? 'from-emerald-500 to-amber-500' : 'from-amber-500 via-emerald-500 to-cyan-500',
    amber:   invert ? 'from-emerald-500 via-amber-500 to-red-500' : 'from-amber-500 to-red-500',
    sky:     'from-slate-500 via-sky-500 to-indigo-400',
  }[color];
  const valueColor = good ? 'text-emerald-300' : (color === 'amber' ? 'text-amber-300' : 'text-slate-300');
  return (
    <div className="rounded-lg bg-white/[0.03] p-2" title={help}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span>
        <span className={`text-xs font-mono font-bold ${valueColor}`}>{display}</span>
      </div>
      <div
        className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
        role="progressbar"
        aria-label={`${label}: ${display}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full bg-gradient-to-r ${fillColor} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
