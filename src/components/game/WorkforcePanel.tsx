'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GameState } from '@/lib/game/types';
import { WORKER_TYPES, getWorkforceBonuses, getCrewCapacity, canHireWorker } from '@/lib/game/workforce';
import type { WorkerType } from '@/lib/game/workforce';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { getLegacyBonuses, DEFAULT_LEGACY } from '@/lib/game/legacy-system';
import { getCapabilityCrewQuarters } from '@/lib/game/building-capabilities';
import { buildCareerCrossoverLine } from '@/lib/game/career-crossover';
// Wave E5 (docs/ECONOMY_PVP_2026-08.md §2.6/§E5): salary is now base × the
// server-wide wage index per crew type — replaces the flat-constant payroll.
// Balance Pass 4 (docs/BALANCE.md "Pass 4"): hire cost is ALSO wage-indexed
// now (getHireCostWithWageIndex — base 6-month bonus × live index, Frontier
// corps capped at neutral), so the button shows exactly what the hire
// handler charges.
import { getMonthlyPayrollForState, getWageIndex, getPayrollAdjustedSalary, getHireCostWithWageIndex, getHireWageIndex, WAGE_INDEX_MAX, GUILD_STRIKE_WAGE_THRESHOLD } from '@/lib/game/labor-market';
// Lever-discoverability pass (2026-09): the launcher is a shared component so
// the Rivals panel can open it pre-targeted at a specific corporation.
import PoachLauncher from './PoachLauncher';

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
  // Pass 9: Frontier-shielded payroll (matches what the tick charges).
  const payroll = getMonthlyPayrollForState(workforce, state);
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
  // Construction Purposes wave: habitat/station crewQuarters capability adds
  // real crew capacity (breakdown row "Habitat crew quarters").
  const capabilityCrewQuarters = getCapabilityCrewQuarters(state);
  const capacity = getCrewCapacity(completedBuildings, state.unlockedLocations.length, state.completedResearch.length, legacyBonusCrew, capabilityCrewQuarters);
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

      {/* Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O4): the poach inbox —
          incoming signing-bonus raids with the 48h counteroffer decision. */}
      <PoachInbox state={state} />

      {/* PvP Discoverability pass (2026-08): the OUTGOING half of the same
          mechanic. M5 shipped /api/space-tycoon/poach with a fully
          implemented `offer` action, complete escrow, detection and
          cooldowns — and shipped no client that ever called it. Production
          telemetry: zero poach offers, ever. That is not a balance problem,
          it is a missing button. This is the button; every rule below is
          enforced server-side and every error string here is the server's
          own. */}
      <PoachLauncher state={state} listenForSubView />

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
            // Balance Pass 4: the REAL charged cost — wage-indexed (Frontier
            // capped at 1.0) with any active headhunt voucher applied. Must
            // match page.tsx's hire handler exactly (no silent divergence).
            const hireCost = getHireCostWithWageIndex(state, worker.type as WorkerType);
            const hireIndex = getHireWageIndex(state, worker.type as WorkerType);
            const canAfford = state.money >= hireCost;
            const hireCheck = canHireWorker(workforce, worker.type as WorkerType, completedBuildings, state.unlockedLocations.length, state.completedResearch.length, legacyBonusCrew, capabilityCrewQuarters);
            const canHire = canAfford && hireCheck.allowed;
            // Wave E5 (§2.6): server-wide wage index for this crew type
            // (market badge shows the RAW index; salary shows the shielded
            // figure payroll actually charges — Pass 9).
            const wageIndex = getWageIndex(state.laborMarket, worker.type as WorkerType);
            const adjustedSalary = getPayrollAdjustedSalary(state, worker.type as WorkerType);
            const wagePinned = wageIndex >= GUILD_STRIKE_WAGE_THRESHOLD;
            const wageHot = wageIndex >= 1.2;

            return (
              <div key={worker.type} className="holo-row flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{worker.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{worker.name}</span>
                      <span className="game-number text-cyan-400 text-xs">{count} hired</span>
                      {wageIndex !== 1.0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            wagePinned ? 'bg-red-500/10 text-red-300 border-red-500/20'
                              : wageHot ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          }`}
                          title={`Server-wide ${worker.name.toLowerCase()} wage index (0.8x-${WAGE_INDEX_MAX.toFixed(1)}x). Rises with hiring demand, falls as more crew housing is built server-wide.`}
                        >
                          Wages ×{wageIndex.toFixed(2)}{wagePinned ? ' — Guild watch' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[10px]">{worker.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-slate-600 text-[10px]">
                        Salary: {formatMoney(adjustedSalary)}/mo{wageIndex !== 1.0 ? ` (base ${formatMoney(worker.salary)})` : ''}
                      </span>
                      <span className="text-slate-600 text-[10px]">·</span>
                      <span
                        className="text-slate-600 text-[10px]"
                        title={`6-month signing bonus at the live wage index (×${hireIndex.toFixed(2)}). Frontier corporations never pay above the base rate.`}
                      >
                        Hire cost: {formatMoney(hireCost)}{hireIndex !== 1.0 ? ` (×${hireIndex.toFixed(2)})` : ''}
                      </span>
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

// ─── Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O4): the poach inbox ──────────
// Incoming signing-bonus raids from state.offense (the sync-delivered
// snapshot). The 48h decision on the defender's side: pay 75% of the rival
// bonus to retain (burned — it goes to the crew), spend the once-per-season
// free Guild Arbitration retention, or concede and keep the cash. Actions
// hit /api/space-tycoon/poach; the money moves through the One-Wallet
// ledger and the headcount outcome lands on the save via the next sync.

function PoachInbox({ state }: { state: GameState }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const now = Date.now();
  const offers = (state.offense?.poachIncoming || []).filter(
    p => p.respondByMs > now && !resolvedIds.includes(p.id)
  );
  if (offers.length === 0) return null;

  const respond = async (offerId: string, response: 'retain' | 'free_retain' | 'concede') => {
    setBusyId(offerId);
    setMessage(null);
    try {
      const res = await fetch('/api/space-tycoon/poach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', offerId, response }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSound('notification');
        setResolvedIds(ids => [...ids, offerId]);
        setMessage(
          response === 'concede'
            ? 'Offer conceded — the crew depart with their bonuses. Headcount updates on the next sync.'
            : response === 'free_retain'
              ? 'Guild arbitration matched the offer at no cost. Crew retained.'
              : 'Counteroffer paid — crew retained. The retention payment went to the crew.'
        );
      } else {
        setMessage(data.error || 'Action failed.');
      }
    } catch {
      setMessage('Network error — try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="hud-frame relative rounded-xl border border-red-500/25 bg-red-500/[0.04] p-3">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <p className="font-hud text-red-300 text-xs font-bold mb-2 uppercase tracking-wider">
        ⚠ Crew under offer — counteroffer window open
      </p>
      <div className="space-y-2">
        {offers.map(p => {
          const crewDef = WORKER_TYPES.find(w => w.type === p.crewType);
          const hoursLeft = Math.max(0, Math.floor((p.respondByMs - now) / 3_600_000));
          return (
            <div key={p.id} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
              <p className="text-xs text-slate-200">
                <span className="font-bold">{p.attackerName || 'An unidentified corporation'}</span>{' '}
                is offering signing bonuses to <span className="font-bold">{p.count} {crewDef?.name.toLowerCase() || p.crewType}{p.count === 1 ? '' : 's'}</span>.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Retain for <span className="text-amber-300 font-mono">{formatMoney(p.retentionCost)}</span> (75% match, paid to the crew)
                · window closes in ~{hoursLeft}h · doing nothing lets them walk.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => respond(p.id, 'retain')}
                  disabled={busyId === p.id || state.money < p.retentionCost}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Counteroffer ({formatMoney(p.retentionCost)})
                </button>
                {p.freeRetentionAvailable && (
                  <button
                    onClick={() => respond(p.id, 'free_retain')}
                    disabled={busyId === p.id}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40"
                  >
                    Guild arbitration (free, 1/season)
                  </button>
                )}
                <button
                  onClick={() => respond(p.id, 'concede')}
                  disabled={busyId === p.id}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/[0.04] border border-white/[0.1] text-slate-400 hover:text-slate-200 disabled:opacity-40"
                >
                  Let them walk
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {message && <p className="text-[11px] text-slate-300 mt-2">{message}</p>}
    </div>
  );
}
