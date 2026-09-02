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

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { GameState, GameTab, ScienceMissionState } from '@/lib/game/types';
import {
  SCIENCE_PROGRAMS, SCIENCE_PROGRAM_MAP,
  planScienceMission, getActiveMissionForProgram, getScienceMissionProgress,
  getPhaseBoundaries, getNpcProgramStatuses, getTotalGameMonths, NPC_PROGRAM_MAP,
  INSTRUMENTS_PER_MISSION, SCIENCE_INSURANCE_PREMIUM_RATE, SCIENCE_INSURANCE_PAYOUT_RATE,
  PHASE_LABEL,
  type ScienceProgramDef, type InstrumentDef,
} from '@/lib/game/science-missions';
import { RESEARCH_MAP } from '@/lib/game/research-tree';
import { getMissionPatchAsset } from '@/lib/game/assets';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import { REAL_SECONDS_PER_GAME_MONTH } from '@/lib/game/server-time';
import { useModalA11y } from './useModalA11y';
import { playSound } from '@/lib/game/sound-engine';
import { ConsolePanel, DataChip } from './chrome';
import GameIcon, { type GameIconGlow } from './GameIcon';
import { resolveIcon, type IconName } from '@/lib/game/icons';

// ─── Program badge (Wave V5 mission-patch wiring) ───────────────────────────
// Every flagship program renders the same way wherever it's listed/selected:
// the W2 mission-patch art when one exists for this program id, falling back
// gracefully to the program's authored emoji glyph routed through the V1
// icon registry. Centralizes the fallback contract documented in assets.ts
// (getMissionPatchAsset) instead of re-deriving it at each call site.
function ProgramBadge({ programId, iconGlyph, size = 20, glow = 'none' }: {
  programId: string; iconGlyph: string | undefined; size?: number; glow?: GameIconGlow;
}) {
  const patch = getMissionPatchAsset(programId);
  if (patch) {
    return (
      <img
        src={patch}
        alt=""
        aria-hidden="true"
        className="rounded-full border border-white/10 shrink-0 object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return <GameIcon name={resolveIcon(iconGlyph, 'science')} size={size} glow={glow} />;
}

interface Props {
  state: GameState;
  onNavigateTab: (tab: GameTab) => void;
  onStartMission: (programId: string, instrumentIds: string[], insured: boolean) => void;
}

type SubTab = 'programs' | 'active' | 'discoveries' | 'npc';

export default function ScienceMissionsPanel({ state, onNavigateTab, onStartMission }: Props) {
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

  const subTabs: { id: SubTab; label: string; icon: IconName; count: number }[] = [
    { id: 'programs', label: 'Programs', icon: 'fleet', count: SCIENCE_PROGRAMS.length },
    { id: 'active', label: 'Missions', icon: 'megastructures', count: activeMissions.length },
    { id: 'discoveries', label: 'Discovery Log', icon: 'discoveries', count: allDiscoveries.length },
    { id: 'npc', label: 'NPC Programs', icon: 'handshake', count: npcStatuses.filter(s => s.coFundOpen).length },
  ];

  return (
    <div className="space-y-4">
      <ConsolePanel
        title="Science Mission Control"
        icon="research"
        subtitle={`Flagship science programs — real instruments, multi-phase timelines, discovery payoffs. Instrument selection decides what each mission can find: a mass spectrometer reads chemistry, radar reads structure, a seismometer reads interiors. Choose ${INSTRUMENTS_PER_MISSION}, fly, and learn.`}
        right={
          <div className="text-right shrink-0">
            <div className="game-label text-[10px]">Active programs</div>
            <div className="font-hud text-cyan-300 text-lg font-bold game-number">{activeMissions.length}</div>
          </div>
        }
      >
        {/* Sub-tab navigation */}
        <div className="game-tab-bar flex flex-wrap gap-1.5 overflow-x-auto" role="tablist" aria-label="Science mission sections">
          {subTabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              onClick={() => setSubTab(t.id)}
              aria-selected={subTab === t.id}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                subTab === t.id ? 'game-tab-active text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <GameIcon name={t.icon} size={13} /> {t.label} <span className="text-slate-500">({t.count})</span>
            </button>
          ))}
        </div>
      </ConsolePanel>

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
        <ConsolePanel title="Discovery Log" icon="discoveries" subtitle="Every finding your flown instruments have rolled, most recent mission-month first.">
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
                    <ProgramBadge programId={d.programId} iconGlyph={program?.icon} size={22} glow="cyan" />
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
        </ConsolePanel>
      )}

      {subTab === 'npc' && (
        <NpcProgramsTab legacyContributions={state.npcProgramContributions || []} />
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
    <ConsolePanel
      title="Flagship Science Programs"
      icon="research"
      subtitle="Twelve real, multi-phase programs — instrument selection determines what each mission can find."
      bodyClassName="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1"
    >
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
                  {/* Mission patch insignia (4X Wave W2 art batch), falling back to
                      the program's icon glyph — program.name carries the semantic
                      label so this is decorative either way. */}
                  <ProgramBadge programId={program.id} iconGlyph={program.icon} size={36} glow={active ? 'amber' : ready ? 'cyan' : 'none'} />
                  <div className="min-w-0">
                    <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
                      {program.name}
                    </h3>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{program.realAnchor}</div>
                  </div>
                </div>
                <div className={`text-[10px] uppercase tracking-wider font-bold shrink-0 ${
                  active ? 'text-amber-300' : completed ? 'text-emerald-300' : ready ? 'text-cyan-300' : 'text-slate-500'
                }`}>
                  {active ? 'IN FLIGHT' : completed ? 'FLOWN' : ready ? 'READY' : 'LOCKED'}
                  {completed && <GameIcon name="check" size={11} className="inline-block ml-0.5 align-[-1px]" />}
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
                    <div className="game-label text-[10px]">{ph.label}</div>
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
                    <DataChip key={id} tone={met ? 'good' : 'bad'} icon={met ? 'check' : 'close'}>
                      {def?.name || id}
                    </DataChip>
                  );
                })}
                {program.minCorporationTier && (
                  <DataChip tone={tierBlocked ? 'bad' : 'good'} icon={tierBlocked ? 'close' : 'check'}>
                    Corp tier {program.minCorporationTier}+
                  </DataChip>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="game-label text-[10px]">Program budget (before instruments)</div>
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
    </ConsolePanel>
  );
}

// ─── Active missions ────────────────────────────────────────────────────────

const PHASE_SEQUENCE = ['design', 'build', 'cruise', 'science_ops'] as const;

function ActiveMissionsTab({ state, onOpenPrograms }: { state: GameState; onOpenPrograms: () => void }) {
  const missions = (state.scienceMissions || []).slice().sort((a, b) => b.startedAtMs - a.startedAtMs);
  if (missions.length === 0) {
    return (
      <ConsolePanel title="Active Missions" icon="megastructures">
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
      </ConsolePanel>
    );
  }
  return (
    <ConsolePanel title="Active Missions" icon="megastructures" subtitle="Design, build, cruise and science operations — every program you've committed to, live." bodyClassName="space-y-3 mt-1">
      {missions.map(m => <MissionCard key={m.id} state={state} mission={m} />)}
    </ConsolePanel>
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
        <div className="min-w-0 flex items-start gap-2">
          <ProgramBadge programId={program.id} iconGlyph={program.icon} size={28} glow={mission.phase === 'failed' ? 'red' : terminal ? 'green' : 'amber'} />
          <div className="min-w-0">
          <h3 className="font-hud text-white text-sm font-bold flex items-center gap-1.5">
            {program.name}
          </h3>
          <div className="text-[10px] text-slate-500">
            {progress.phaseLabel}
            {mission.failedReason && ` — ${mission.failedReason === 'launch_failure' ? 'lost at launch' : 'lost in cruise'}`}
            {' · '}{mission.insured ? 'insured' : 'uninsured'}
            {' · '}{formatMoney(mission.totalCost)} committed
          </div>
          </div>
        </div>
        {!terminal && progress.monthsToNextPhase !== null && progress.monthsToNextPhase > 0 && (
          <div className="text-right shrink-0">
            <div className="game-label text-[10px]">Next phase</div>
            <div className="font-hud text-cyan-300 text-xs font-bold">
              {formatCountdown(progress.monthsToNextPhase * REAL_SECONDS_PER_GAME_MONTH)}
            </div>
          </div>
        )}
        {mission.phase === 'on_station' && (
          <div className="text-right shrink-0">
            <div className="game-label text-[10px]">Status</div>
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
                <span className="text-[10px] font-hud font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
                  {isDone && <GameIcon name="check" size={9} />}{label}
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
            <DataChip key={id} tone="info">{inst?.name || id}</DataChip>
          );
        })}
      </div>

      {/* Milestone + discoveries summary */}
      {mission.milestoneEligibleId && (
        <div className="text-[10px] text-amber-300 mb-1 flex items-center gap-1">
          <GameIcon name="territory" size={11} glow="amber" />
          Milestone: {mission.milestoneEligibleId.replace(/_/g, ' ')}
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

// ─── NPC co-funding board (Live-Service Wave LS5 part 2 — real server ledger) ─
// docs/LIVE_SERVICE_2026-08.md §LS5. Server-backed and world-shared: every
// player's stake counts toward the SAME cycle's pool, unlike the pre-LS5
// client-simulated version (one contribution per player, never aggregated).
// Self-fetching, same pattern as AllianceTreasuryPanel.tsx — never trusts
// client state for money or settlement outcomes.

interface CoFundProgramStatus {
  npcProgramId: string;
  cycleIndex: number;
  phaseLabel: string;
  coFundOpen: boolean;
  monthsToSettlement: number;
  settlesAtMonth: number;
  totalStaked: number;
  stakerCount: number;
  myStake: { shares: number; amount: number; settled: boolean; payout: number | null } | null;
}

function NpcProgramsTab({ legacyContributions }: {
  legacyContributions: NonNullable<GameState['npcProgramContributions']>;
}) {
  const [programs, setPrograms] = useState<CoFundProgramStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/space-tycoon/science/co-fund');
      const json = await res.json();
      setPrograms(Array.isArray(json.programs) ? json.programs : []);
    } catch {
      setError('Failed to load NPC program status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStake = useCallback(async (npcProgramId: string) => {
    if (staking) return;
    setStaking(npcProgramId);
    try {
      const res = await fetch('/api/space-tycoon/science/co-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stake', npcProgramId, shares: 1 }),
      });
      const result = await res.json();
      if (result.success) {
        playSound('money');
        await fetchStatus();
      } else {
        setError(result.error || 'Co-funding failed');
        playSound('error');
      }
    } catch {
      setError('Network error');
      playSound('error');
    }
    setStaking(null);
  }, [staking, fetchStatus]);

  const unsettledLegacy = legacyContributions.filter(c => !c.settled);

  return (
    <ConsolePanel
      title="NPC Co-Funding Board"
      icon="handshake"
      subtitle="NPC factions run public science programs on fixed, published schedules — co-fund an open window for a share of the settlement. Every player's stake counts toward the SAME world-shared pool (real money, real server ledger). Settlement pays a program-wide multiplier one full cycle later: positive expected value, real downside, faction standing on top."
      bodyClassName="space-y-3 mt-1"
    >
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 text-[11px]">{error}</div>
      )}
      {unsettledLegacy.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-2 text-amber-200/80 text-[10px]">
          {unsettledLegacy.length} legacy stake{unsettledLegacy.length === 1 ? '' : 's'} from before the server-ledger
          upgrade {unsettledLegacy.length === 1 ? 'is' : 'are'} still finishing out on the old client-side path — they&apos;ll
          settle normally on their original schedule.
        </div>
      )}
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {programs.map(s => {
            const def = NPC_PROGRAM_MAP.get(s.npcProgramId);
            if (!def) return null;
            return (
              <div key={s.npcProgramId} className={`hud-frame relative rounded-2xl border p-3 ${s.coFundOpen ? 'hud-frame-purple border-indigo-500/40' : 'border-white/[0.06]'}`} style={{ background: '#0a0a1a' }}>
                <span className="hud-corner-bl" aria-hidden="true" />
                <span className="hud-corner-br" aria-hidden="true" />
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-start gap-2">
                    <GameIcon name={resolveIcon(def.icon, 'handshake')} size={20} glow="purple" />
                    <div>
                      <h3 className="font-hud text-white text-sm font-bold">{def.name}</h3>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">{def.factionLabel}</div>
                    </div>
                  </div>
                  <DataChip tone={s.coFundOpen ? 'info' : 'neutral'} className="uppercase tracking-wider font-bold">
                    {s.phaseLabel}
                  </DataChip>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{def.description}</p>
                <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
                  <div className="rounded bg-white/[0.03] p-1.5">
                    <div className="game-label text-[10px]">Stake</div>
                    <div className="font-hud text-[10px] text-white font-bold">{formatMoney(def.coFundCost)}</div>
                  </div>
                  <div className="rounded bg-white/[0.03] p-1.5">
                    <div className="game-label text-[10px]">World pool</div>
                    <div className="font-hud text-[10px] text-cyan-200 font-bold">{formatMoney(s.totalStaked)} ({s.stakerCount})</div>
                  </div>
                  <div className="rounded bg-white/[0.03] p-1.5">
                    <div className="game-label text-[10px]">Settles in</div>
                    <div className="font-hud text-[10px] text-amber-200 font-bold">{s.monthsToSettlement} mo</div>
                  </div>
                </div>
                {s.myStake ? (
                  <div className="text-[10px] text-emerald-300 flex items-center gap-1">
                    <GameIcon name="check" size={11} glow="green" />
                    Staked {formatMoney(s.myStake.amount)} this cycle{s.myStake.settled ? ` — settled for ${formatMoney(s.myStake.payout || 0)}` : ` — settles at world month ${s.settlesAtMonth}`}
                  </div>
                ) : s.coFundOpen ? (
                  <button
                    type="button"
                    disabled={staking === s.npcProgramId}
                    onClick={() => handleStake(s.npcProgramId)}
                    className={`min-h-[44px] w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      staking !== s.npcProgramId ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {staking === s.npcProgramId ? 'Staking...' : `Co-fund — ${formatMoney(def.coFundCost)}`}
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-500">
                    Window closed — next window opens at world month {s.settlesAtMonth} (published schedule).
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ConsolePanel>
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
          <div className="flex items-start gap-2 min-w-0">
            <ProgramBadge programId={program.id} iconGlyph={program.icon} size={28} glow="cyan" />
            <div className="min-w-0">
              <h3 className="font-hud text-white text-sm font-bold">
                {program.name} — Instrument Selection
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fly exactly {INSTRUMENTS_PER_MISSION} instruments within the {program.massBudgetKg.toLocaleString()} kg payload budget.
                What you fly determines what you can find.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close instrument selection"
            className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center shrink-0"
          >
            <GameIcon name="close" size={16} />
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
                        <div className="text-xs text-white font-semibold flex items-center gap-1">
                          {isSelected && <GameIcon name="check" size={12} glow="cyan" />}
                          {inst.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">{inst.heritage}</div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{inst.finds}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-hud text-[10px] text-cyan-200 font-bold">{inst.massKg.toLocaleString()} kg</div>
                        <div className="text-[10px] text-slate-500">{formatMoney(inst.cost)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Discovery table preview — published probabilities */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="game-label text-[10px] mb-1.5">Discovery table with this loadout (published odds, per ops month)</div>
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
              <div className="text-[10px] text-amber-300 mt-1.5 flex items-center gap-1">
                <GameIcon name="territory" size={11} glow="amber" />
                Global first-claim: “{program.milestone.label}”
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
      <div className="game-label text-[10px]">{label}</div>
      <div className={`font-hud text-[11px] font-bold ${strong ? 'text-cyan-200' : 'text-white'}`}>{value}</div>
    </div>
  );
}
