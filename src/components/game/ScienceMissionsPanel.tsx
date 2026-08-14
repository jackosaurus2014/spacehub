'use client';

// ─── Science Mission Control (4X Upgrade Wave W6) ───────────────────────────
// docs/4X_BASELINE_2026-08.md Part 2b — the flagship scientific-missions
// layer. Program cards with phase tracks (phase-track-node pattern from
// GameStyles), an instrument-picker modal (the meaningful decision: fly 3 of
// 5-7 real instruments inside a mass budget — chosen instruments determine
// which discovery tables can roll), live mission status, a discovery log,
// and the forecastable NPC co-funding board (NPC_BACKDROP).
//
// A11y: instrument picker uses useModalA11y (focus trap + Escape + focus
// restore); all controls are ≥44px touch targets; state is never conveyed by
// color alone (every colored chip carries text); animations ride existing
// GameStyles classes which are reduced-motion-guarded.

import { useMemo, useState } from 'react';
import type { GameState, GameTab, ScienceMissionState } from '@/lib/game/types';
import {
  SCIENCE_PROGRAMS, SCIENCE_PROGRAM_MAP,
  planScienceMission, getActiveMissionForProgram, getScienceMissionProgress,
  getPhaseBoundaries, getNpcProgramStatuses, getTotalGameMonths,
  INSTRUMENTS_PER_MISSION, SCIENCE_INSURANCE_PREMIUM_RATE, SCIENCE_INSURANCE_PAYOUT_RATE,
  PHASE_LABEL,
  type ScienceProgramDef, type InstrumentDef,
} from '@/lib/game/science-missions';
import { RESEARCH_MAP } from '@/lib/game/research-tree';
import { getMissionPatchAsset } from '@/lib/game/assets';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import { TICK_INTERVALS, TICKS_PER_GAME_MONTH } from '@/lib/game/constants';
import { useModalA11y } from './useModalA11y';

const REAL_SECONDS_PER_GAME_MONTH = TICKS_PER_GAME_MONTH * (TICK_INTERVALS[1] / 1000);

interface Props {
  state: GameState;
  onNavigateTab: (tab: GameTab) => void;
  onStartMission: (programId: string, instrumentIds: string[], insured: boolean) => void;
  onCoFundNpcProgram: (npcProgramId: string) => void;
}

type SubTab = 'programs' | 'active' | 'discoveries' | 'npc';

export default function ScienceMissionsPanel({ state, onNavigateTab, onStartMission, onCoFundNpcProgram }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('programs');
  const [plannerProgramId, setPlannerProgramId] = useState<string | null>(null);

  const missions = state.scienceMissions || [];
  const activeMissions = missions.filter(m => m.phase !== 'completed' && m.phase !== 'failed');
  const allDiscoveries = missions.flatMap(m =>
    m.discoveries.map(d => ({ ...d, programId: m.programId })),
  ).sort((a, b) => b.missionMonth - a.missionMonth);
  const monthIndex = getTotalGameMonths(state.gameDate);
  const npcStatuses = getNpcProgramStatuses(monthIndex);

  const plannerProgram = plannerProgramId ? SCIENCE_PROGRAM_MAP.get(plannerProgramId) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="hud-frame relative rounded-2xl border border-cyan-500/20 p-4" style={{ background: '#050510' }}>
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
              <span className="text-cyan-400" aria-hidden="true">🔬</span> Science Mission Control
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
              Flagship science programs — real instruments, multi-phase timelines, discovery payoffs.
              Instrument selection decides what each mission can find: a mass spectrometer reads chemistry,
              radar reads structure, a seismometer reads interiors. Choose {INSTRUMENTS_PER_MISSION}, fly, and learn.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="game-label text-[9px]">Active programs</div>
            <div className="font-hud text-cyan-300 text-lg font-bold">{activeMissions.length}</div>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="game-tab-bar flex flex-wrap gap-1.5 overflow-x-auto" role="tablist" aria-label="Science mission sections">
        {([
          { id: 'programs' as SubTab, label: 'Programs', icon: '🚀', count: SCIENCE_PROGRAMS.length },
          { id: 'active' as SubTab, label: 'Missions', icon: '🛰️', count: activeMissions.length },
          { id: 'discoveries' as SubTab, label: 'Discovery Log', icon: '🔭', count: allDiscoveries.length },
          { id: 'npc' as SubTab, label: 'NPC Programs', icon: '🤝', count: npcStatuses.filter(s => s.coFundOpen).length },
        ]).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            aria-pressed={subTab === t.id}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'game-tab-active bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label} <span className="text-slate-500">({t.count})</span>
          </button>
        ))}
      </div>

      {subTab === 'programs' && (
        <ProgramsTab
          state={state}
          onOpenPlanner={setPlannerProgramId}
          onNavigateTab={onNavigateTab}
        />
      )}

      {subTab === 'active' && (
        <ActiveMissionsTab state={state} onOpenPrograms={() => setSubTab('programs')} />
      )}

      {subTab === 'discoveries' && (
        <div className="space-y-2">
          {allDiscoveries.length === 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-slate-500 text-xs">
              No discoveries yet. Discoveries roll monthly during science operations — and only
              instruments you flew can make them.
            </div>
          )}
          {allDiscoveries.map(d => {
            const program = SCIENCE_PROGRAM_MAP.get(d.programId);
            return (
              <div key={d.id} className="hud-frame relative rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <span className="hud-corner-bl" aria-hidden="true" />
                <span className="hud-corner-br" aria-hidden="true" />
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0" aria-hidden="true">{program?.icon || '🔬'}</span>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-bold font-hud">{d.name}</div>
                    <div className="text-[10px] text-slate-500 mb-1">{program?.name} · mission month {d.missionMonth}</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{d.summary}</p>
                    <div className="text-[10px] text-emerald-300 mt-1">{d.payoffSummary}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'npc' && (
        <NpcProgramsTab state={state} monthIndex={monthIndex} onCoFund={onCoFundNpcProgram} />
      )}

      {/* Instrument-picker modal */}
      {plannerProgram && (
        <InstrumentPickerModal
          state={state}
          program={plannerProgram}
          onClose={() => setPlannerProgramId(null)}
          onLaunch={(instrumentIds, insured) => {
            onStartMission(plannerProgram.id, instrumentIds, insured);
            setPlannerProgramId(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Programs catalog ───────────────────────────────────────────────────────

function ProgramsTab({ state, onOpenPlanner, onNavigateTab }: {
  state: GameState;
  onOpenPlanner: (programId: string) => void;
  onNavigateTab: (tab: GameTab) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {SCIENCE_PROGRAMS.map(program => {
        const missingResearch = program.requiredResearch.filter(id => !state.completedResearch.includes(id));
        const tierBlocked = !!program.minCorporationTier && (state.corporationTier || 1) < program.minCorporationTier;
        const active = getActiveMissionForProgram(state, program.id);
        const priorMissions = (state.scienceMissions || []).filter(m => m.programId === program.id);
        const completed = priorMissions.some(m => m.phase === 'completed' || m.phase === 'extended_ops');
        const ready = missingResearch.length === 0 && !tierBlocked && !active;
        const bounds = getPhaseBoundaries(program);

        return (
          <div
            key={program.id}
            className={`hud-frame relative rounded-2xl border overflow-hidden transition-all ${
              active ? 'hud-frame-amber border-amber-500/40'
              : ready ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'border-white/[0.06]'
            }`}
            style={{ background: '#050510' }}
          >
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex items-start gap-2">
                  {getMissionPatchAsset(program.id) && (
                    // Mission patch insignia (4X Wave W2 art batch) — decorative,
                    // program.icon carries the semantic label so this is aria-hidden.
                    <img
                      src={getMissionPatchAsset(program.id)!}
                      alt=""
                      aria-hidden="true"
                      className="w-9 h-9 rounded-full border border-white/10 shrink-0 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
                      <span aria-hidden="true">{program.icon}</span> {program.name}
                    </h3>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">{program.realAnchor}</div>
                  </div>
                </div>
                <div className={`text-[10px] uppercase tracking-wider font-bold shrink-0 ${
                  active ? 'text-amber-300' : completed ? 'text-emerald-300' : ready ? 'text-cyan-300' : 'text-slate-500'
                }`}>
                  {active ? 'IN FLIGHT' : completed ? 'FLOWN ✓' : ready ? 'READY' : 'LOCKED'}
                </div>
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{program.description}</p>

              {/* Phase plan strip */}
              <div className="flex items-center gap-1 mb-2" aria-label={`Phase plan: design ${program.designMonths} months, build ${program.buildMonths}, cruise ${program.cruiseMonths}, operations ${program.opsMonths}${program.openEnded ? ' then extended' : ''}`}>
                {[
                  { label: 'Design', months: program.designMonths },
                  { label: 'Build', months: program.buildMonths },
                  { label: 'Cruise', months: program.cruiseMonths },
                  { label: program.waitsForIsoWindow ? 'Wait+Ops' : 'Ops', months: program.opsMonths },
                ].map(ph => (
                  <div key={ph.label} className="flex-1 rounded bg-white/[0.03] border border-white/[0.06] px-1.5 py-1 text-center">
                    <div className="game-label text-[8px]">{ph.label}</div>
                    <div className="font-hud text-[10px] text-cyan-200 font-bold">
                      {ph.months} mo{program.openEnded && ph.label === 'Ops' ? '+' : ''}
                      {program.waitsForIsoWindow && ph.label === 'Wait+Ops' ? '?' : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Requirements + cost */}
              <div className="flex flex-wrap gap-1 mb-2">
                {program.requiredResearch.map(id => {
                  const met = state.completedResearch.includes(id);
                  const def = RESEARCH_MAP.get(id);
                  return (
                    <span
                      key={id}
                      className={`text-[9px] px-1.5 py-0.5 rounded border ${
                        met ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5' : 'border-red-500/30 text-red-300 bg-red-500/5'
                      }`}
                    >
                      {met ? '✓' : '✗'} {def?.name || id}
                    </span>
                  );
                })}
                {program.minCorporationTier && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    tierBlocked ? 'border-red-500/30 text-red-300 bg-red-500/5' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5'
                  }`}>
                    {tierBlocked ? '✗' : '✓'} Corp tier {program.minCorporationTier}+
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="game-label text-[9px]">Program budget (before instruments)</div>
                  <div className="font-hud text-white text-sm font-bold">{formatMoney(program.baseCost)}</div>
                </div>
                {active ? (
                  <span className="text-[10px] text-amber-300">{PHASE_LABEL[active.phase]}</span>
                ) : (
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => onOpenPlanner(program.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      ready
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                        : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {ready ? 'Plan Mission →' : 'Requirements not met'}
                  </button>
                )}
              </div>
              {missingResearch.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('research')}
                  className="mt-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 min-h-[24px]"
                >
                  Open Research tree →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Active missions ────────────────────────────────────────────────────────

const PHASE_SEQUENCE = ['design', 'build', 'cruise', 'science_ops'] as const;

function ActiveMissionsTab({ state, onOpenPrograms }: { state: GameState; onOpenPrograms: () => void }) {
  const missions = (state.scienceMissions || []).slice().sort((a, b) => b.startedAtMs - a.startedAtMs);
  if (missions.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <p className="text-slate-400 text-xs mb-3">No science programs started yet.</p>
        <button
          type="button"
          onClick={onOpenPrograms}
          className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
        >
          Browse the 12 flagship programs →
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {missions.map(m => <MissionCard key={m.id} state={state} mission={m} />)}
    </div>
  );
}

function MissionCard({ state, mission }: { state: GameState; mission: ScienceMissionState }) {
  const progress = getScienceMissionProgress(state, mission.id);
  const program = SCIENCE_PROGRAM_MAP.get(mission.programId);
  if (!progress || !program) return null;
  const terminal = mission.phase === 'completed' || mission.phase === 'failed';
  const phaseIdx = mission.phase === 'on_station' ? 3
    : mission.phase === 'extended_ops' || mission.phase === 'completed' ? 4
    : PHASE_SEQUENCE.indexOf(mission.phase as typeof PHASE_SEQUENCE[number]);

  return (
    <div
      className={`hud-frame relative rounded-2xl border p-3 ${
        mission.phase === 'failed' ? 'hud-frame-red border-red-500/30'
        : terminal ? 'border-emerald-500/30'
        : 'hud-frame-amber border-amber-500/30'
      }`}
      style={{ background: '#050510' }}
    >
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
            <span aria-hidden="true">{program.icon}</span> {program.name}
          </h3>
          <div className="text-[10px] text-slate-500">
            {progress.phaseLabel}
            {mission.failedReason && ` — ${mission.failedReason === 'launch_failure' ? 'lost at launch' : 'lost in cruise'}`}
            {' · '}{mission.insured ? 'insured' : 'uninsured'}
            {' · '}{formatMoney(mission.totalCost)} committed
          </div>
        </div>
        {!terminal && progress.monthsToNextPhase !== null && progress.monthsToNextPhase > 0 && (
          <div className="text-right shrink-0">
            <div className="game-label text-[9px]">Next phase</div>
            <div className="font-hud text-cyan-300 text-xs font-bold">
              {formatCountdown(progress.monthsToNextPhase * REAL_SECONDS_PER_GAME_MONTH)}
            </div>
          </div>
        )}
        {mission.phase === 'on_station' && (
          <div className="text-right shrink-0">
            <div className="game-label text-[9px]">Status</div>
            <div className="font-hud text-amber-300 text-xs font-bold">Awaiting ISO detection</div>
          </div>
        )}
      </div>

      {/* Phase track (phase-track-node pattern) */}
      <ol className="flex items-center gap-1 mb-2" aria-label={`Mission phases — currently ${progress.phaseLabel}`}>
        {['Design', 'Build', 'Cruise', program.waitsForIsoWindow ? 'Intercept' : 'Science Ops', program.openEnded ? 'Extended' : 'Return'].map((label, i) => {
          const isDone = mission.phase === 'failed' ? false : i < phaseIdx || mission.phase === 'completed';
          const isCurrent = !terminal && i === phaseIdx;
          return (
            <li key={label} className="flex-1">
              <div
                className={`phase-track-node rounded-lg border px-1.5 py-1 text-center ${
                  isDone ? 'phase-track-node-complete border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : isCurrent ? 'phase-track-node-current border-amber-500/50 bg-amber-500/10 text-amber-200'
                  : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
                }`}
              >
                <span className="text-[9px] font-hud font-bold uppercase tracking-wider">
                  {isDone ? '✓ ' : ''}{label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Progress bar */}
      {!terminal && (
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2" role="progressbar"
          aria-valuenow={Math.round(progress.progressPct * 100)} aria-valuemin={0} aria-valuemax={100}
          aria-label={`${program.name} mission progress`}>
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-400" style={{ width: `${Math.round(progress.progressPct * 100)}%` }} />
        </div>
      )}

      {/* Fitted instruments */}
      <div className="flex flex-wrap gap-1 mb-1">
        {mission.instrumentIds.map(id => {
          const inst = program.instruments.find(i => i.id === id);
          return (
            <span key={id} className="text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/20 text-cyan-200 bg-cyan-500/5">
              {inst?.name || id}
            </span>
          );
        })}
      </div>

      {/* Milestone + discoveries summary */}
      {mission.milestoneEligibleId && (
        <div className="text-[10px] text-amber-300 mb-1">
          🏁 Milestone: {mission.milestoneEligibleId.replace(/_/g, ' ')}
          {mission.milestoneClaimAttempted ? ' — claim submitted to the global race' : ' — claiming…'}
        </div>
      )}
      {mission.discoveries.length > 0 && (
        <div className="text-[10px] text-slate-400">
          {mission.discoveries.length} discover{mission.discoveries.length === 1 ? 'y' : 'ies'}:
          {' '}{mission.discoveries.map(d => d.name).join(' · ')}
        </div>
      )}
    </div>
  );
}

// ─── NPC co-funding board ───────────────────────────────────────────────────

function NpcProgramsTab({ state, monthIndex, onCoFund }: {
  state: GameState;
  monthIndex: number;
  onCoFund: (npcProgramId: string) => void;
}) {
  const statuses = getNpcProgramStatuses(monthIndex);
  const contributions = state.npcProgramContributions || [];
  return (
    <div className="space-y-3">
      <p className="text-slate-500 text-[11px]">
        NPC factions run public science programs on fixed, published schedules — co-fund an open window
        for a share of the settlement. Settlement pays a program-wide multiplier (the same for every
        co-funder) one full cycle later: positive expected value, real downside, faction standing on top.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {statuses.map(s => {
          const funded = contributions.find(c => c.npcProgramId === s.def.id && c.cycleIndex === s.cycleIndex);
          const canAfford = state.money >= s.def.coFundCost;
          return (
            <div key={s.def.id} className={`hud-frame relative rounded-2xl border p-3 ${s.coFundOpen ? 'hud-frame-purple border-indigo-500/40' : 'border-white/[0.06]'}`} style={{ background: '#0a0a1a' }}>
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
                    <span aria-hidden="true">{s.def.icon}</span> {s.def.name}
                  </h3>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">{s.def.factionLabel}</div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
                  s.coFundOpen ? 'border-indigo-500/40 text-indigo-200 bg-indigo-500/10' : 'border-white/[0.08] text-slate-400 bg-white/[0.03]'
                }`}>
                  {s.phaseLabel}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{s.def.description}</p>
              <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
                <div className="rounded bg-white/[0.03] p-1.5">
                  <div className="game-label text-[8px]">Stake</div>
                  <div className="font-hud text-[10px] text-white font-bold">{formatMoney(s.def.coFundCost)}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5">
                  <div className="game-label text-[8px]">Payout band</div>
                  <div className="font-hud text-[10px] text-cyan-200 font-bold">×{s.def.payoutMultRange[0].toFixed(1)}–{s.def.payoutMultRange[1].toFixed(1)}</div>
                </div>
                <div className="rounded bg-white/[0.03] p-1.5">
                  <div className="game-label text-[8px]">Settles in</div>
                  <div className="font-hud text-[10px] text-amber-200 font-bold">{s.monthsToSettlement} mo</div>
                </div>
              </div>
              {funded ? (
                <div className="text-[10px] text-emerald-300">
                  ✓ Staked {formatMoney(funded.amount)} this cycle{funded.settled ? ` — settled for ${formatMoney(funded.payout || 0)}` : ` — settles at world month ${funded.settlesAtMonth}`}
                </div>
              ) : s.coFundOpen ? (
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onCoFund(s.def.id)}
                  className={`min-h-[44px] w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    canAfford ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? `Co-fund — ${formatMoney(s.def.coFundCost)}` : `Requires ${formatMoney(s.def.coFundCost)}`}
                </button>
              ) : (
                <div className="text-[10px] text-slate-500">
                  Window closed — next window opens at world month {s.cycleStartMonth + s.def.cycleMonths} (published schedule).
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Instrument picker modal (the meaningful decision) ──────────────────────

function InstrumentPickerModal({ state, program, onClose, onLaunch }: {
  state: GameState;
  program: ScienceProgramDef;
  onClose: () => void;
  onLaunch: (instrumentIds: string[], insured: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [insured, setInsured] = useState(true);
  const modalRef = useModalA11y<HTMLDivElement>(onClose);

  const totalMass = selected.reduce((s, id) => s + (program.instruments.find(i => i.id === id)?.massKg || 0), 0);
  const massPct = Math.min(100, Math.round((totalMass / program.massBudgetKg) * 100));
  const overBudget = totalMass > program.massBudgetKg;

  const plan = useMemo(() => (
    selected.length === INSTRUMENTS_PER_MISSION
      ? planScienceMission(state, { programId: program.id, instrumentIds: selected, insured })
      : null
  ), [state, program.id, selected, insured]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : prev.length < INSTRUMENTS_PER_MISSION ? [...prev, id] : prev);
  };

  /** Which discovery entries the current loadout can roll — published odds,
   *  shown live so the tradeoff is legible before money moves. */
  const reachable = program.discoveryTable.map(entry => {
    const set = new Set(selected);
    const anyOf = entry.requiresInstruments.some(id => set.has(id));
    const allOf = (entry.requiresAllInstruments || []).every(id => set.has(id));
    return { entry, reachable: anyOf && allOf };
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Plan mission: ${program.name}`}
        tabIndex={-1}
        className="hud-frame relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-cyan-500/30"
        style={{ background: '#050510' }}
      >
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 p-4 pb-3 border-b border-white/[0.06]" style={{ background: '#050510' }}>
          <div>
            <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
              <span aria-hidden="true">{program.icon}</span> {program.name} — Instrument Selection
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Fly exactly {INSTRUMENTS_PER_MISSION} instruments within the {program.massBudgetKg.toLocaleString()} kg payload budget.
              What you fly determines what you can find.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close instrument selection"
            className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Mass budget bar */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="game-label">Payload mass — {selected.length}/{INSTRUMENTS_PER_MISSION} instruments</span>
              <span className={`font-hud font-bold ${overBudget ? 'text-red-300' : 'text-cyan-200'}`}>
                {totalMass.toLocaleString()} / {program.massBudgetKg.toLocaleString()} kg{overBudget ? ' — OVER BUDGET' : ''}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden" role="progressbar"
              aria-valuenow={massPct} aria-valuemin={0} aria-valuemax={100} aria-label="Payload mass budget used">
              <div className={`h-full rounded-full ${overBudget ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${massPct}%` }} />
            </div>
          </div>

          {/* Instrument list */}
          <fieldset>
            <legend className="sr-only">Instruments — choose exactly {INSTRUMENTS_PER_MISSION}</legend>
            <div className="space-y-1.5">
              {program.instruments.map(inst => {
                const isSelected = selected.includes(inst.id);
                const slotsFull = !isSelected && selected.length >= INSTRUMENTS_PER_MISSION;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggle(inst.id)}
                    disabled={slotsFull}
                    aria-pressed={isSelected}
                    className={`module-socket w-full min-h-[44px] text-left rounded-xl border p-2.5 transition-colors ${
                      isSelected
                        ? 'module-socket-filled border-cyan-500/40 bg-cyan-500/5'
                        : slotsFull
                          ? 'module-socket-empty border-white/[0.05] opacity-50 cursor-not-allowed'
                          : 'module-socket-empty border-white/[0.08] hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-white font-semibold">
                          {isSelected ? '☑' : '☐'} {inst.name}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">{inst.heritage}</div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{inst.finds}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-hud text-[10px] text-cyan-200 font-bold">{inst.massKg.toLocaleString()} kg</div>
                        <div className="text-[9px] text-slate-500">{formatMoney(inst.cost)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Discovery table preview — published probabilities */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="game-label text-[9px] mb-1.5">Discovery table with this loadout (published odds, per ops month)</div>
            <ul className="space-y-1">
              {reachable.map(({ entry, reachable: ok }) => (
                <li key={entry.id} className={`text-[10px] flex items-start gap-1.5 ${ok ? 'text-emerald-200' : 'text-slate-600'}`}>
                  <span className="shrink-0" aria-hidden="true">{ok ? '●' : '○'}</span>
                  <span>
                    <span className="font-semibold">{entry.name}</span>
                    {ok
                      ? ` — rollable, ${(entry.monthlyProb * 100).toFixed(0)}%/mo`
                      : ` — needs ${[...entry.requiresInstruments, ...(entry.requiresAllInstruments || [])].map(id => program.instruments.find(i => i.id === id)?.name || id).join(' / ')}`}
                  </span>
                </li>
              ))}
            </ul>
            {program.milestone && (
              <div className="text-[10px] text-amber-300 mt-1.5">
                🏁 Global first-claim: “{program.milestone.label}”
                {program.milestone.requiresInstrument && ` — requires ${program.instruments.find(i => i.id === program.milestone!.requiresInstrument)?.name}`}
              </div>
            )}
          </div>

          {/* Insurance toggle */}
          <label className="flex items-start gap-2 min-h-[44px] cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
            <input
              type="checkbox"
              checked={insured}
              onChange={e => setInsured(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-500"
            />
            <span className="text-[11px] text-slate-300">
              <span className="font-semibold text-white">Launch + cruise insurance</span>
              {' '}— {Math.round(SCIENCE_INSURANCE_PREMIUM_RATE * 100)}% premium buys a {Math.round(SCIENCE_INSURANCE_PAYOUT_RATE * 100)}% payout
              if the vehicle is lost at launch or in cruise. Skipping it is a real gamble — that is the decision.
            </span>
          </label>

          {/* Quote + launch */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            {plan?.ok ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center mb-2">
                  <QuoteCell label="Program" value={formatMoney(plan.costs.programBaseCost)} />
                  <QuoteCell label="Instruments" value={formatMoney(plan.costs.instrumentsCost)} />
                  <QuoteCell label="Insurance" value={plan.costs.insurancePremium > 0 ? formatMoney(plan.costs.insurancePremium) : '—'} />
                  <QuoteCell label="Total" value={formatMoney(plan.costs.totalMoneyCost)} strong />
                </div>
                <button
                  type="button"
                  onClick={() => onLaunch(selected, insured)}
                  className="min-h-[44px] w-full px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                >
                  Commit {formatMoney(plan.costs.totalMoneyCost)} — Start {program.name}
                </button>
              </>
            ) : (
              <div className="text-[11px] text-slate-400 text-center py-1">
                {selected.length < INSTRUMENTS_PER_MISSION
                  ? `Select ${INSTRUMENTS_PER_MISSION - selected.length} more instrument${INSTRUMENTS_PER_MISSION - selected.length === 1 ? '' : 's'} to quote the mission.`
                  : plan && !plan.ok && plan.reason === 'insufficient_funds'
                    ? (plan.detail || 'Insufficient funds.')
                    : plan && !plan.ok && plan.reason === 'over_mass_budget'
                      ? (plan.detail || 'Over mass budget — swap an instrument.')
                      : 'Loadout invalid — adjust your selection.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded bg-white/[0.03] p-1.5">
      <div className="game-label text-[8px]">{label}</div>
      <div className={`font-hud text-[11px] font-bold ${strong ? 'text-cyan-200' : 'text-white'}`}>{value}</div>
    </div>
  );
}
