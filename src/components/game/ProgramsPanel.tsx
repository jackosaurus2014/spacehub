'use client';

// ─── Programs Panel (Live-Service Wave LS6 "Programs Queue") ───────────────
// docs/LIVE_SERVICE_2026-08.md §LS6. EVE-style training queues: crew
// certification cohorts, leader development postings, and R&D residencies —
// each track a single wall-clock channel, up to 3 queued ahead. Lives inside
// the Workforce tab (page.tsx), below WorkforcePanel — LS6 does not add a
// 29th top-level tab, matching the LS1 StandingOrdersPanel precedent this
// component's shape follows (self-contained onUpdateState updater, minimal
// page.tsx wiring).

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import type { ProgramTrack } from '@/lib/game/types';
import {
  PROGRAM_DEFS, PROGRAM_DEF_MAP, getProgramQueue, getProgramTrackCapacity,
  enqueueProgram, dequeueProgram, reorderProgram,
  getReservedLeaderIds, getProgramWorkforceBonuses,
} from '@/lib/game/programs';
import { COMMANDER_MAP, RARITY_LABEL, CLASS_LABEL, getRetirementEtaMs } from '@/lib/game/commanders';
import { RESEARCH_CATEGORIES } from '@/lib/game/research-tree';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from '@/components/game/GameIcon';
import type { IconName } from '@/lib/game/icons';
import HoloTip, { Concept } from '@/components/game/HoloTip';

interface ProgramsPanelProps {
  state: GameState;
  onUpdateState: (updater: (prev: GameState) => GameState) => void;
}

const TRACK_LABEL: Record<ProgramTrack, string> = {
  crew_cohort: 'Crew Cohorts',
  leader_development: 'Leadership Development',
  rd_residency: 'R&D Residency',
};

const TRACK_ICON: Record<ProgramTrack, IconName> = {
  crew_cohort: 'track-crew-cohort', leader_development: 'track-leader-development', rd_residency: 'track-rd-residency',
};

const BONUS_FIELD_LABEL: Record<string, string> = {
  buildSpeed: 'Build Speed', researchSpeed: 'Research Speed', miningOutput: 'Mining Output',
  serviceRevenue: 'Service Revenue', contractPayBonus: 'Contract Payouts',
  hazardMitigation: 'Hazard Mitigation', crewSurvival: 'Crew Survival', shipEfficiency: 'Ship Efficiency',
};

function formatEta(remainingMs: number): string {
  if (remainingMs <= 0) return 'Complete';
  const days = Math.floor(remainingMs / 86_400_000);
  const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  const mins = Math.floor((remainingMs % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export default function ProgramsPanel({ state, onUpdateState }: ProgramsPanelProps) {
  const [track, setTrack] = useState<ProgramTrack>('crew_cohort');
  const [cohortDefPick, setCohortDefPick] = useState('');
  const [commanderPick, setCommanderPick] = useState('');
  const [categoryPick, setCategoryPick] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const queue = getProgramQueue(state, track);
  const capacity = getProgramTrackCapacity(state, track);
  const trackDefs = PROGRAM_DEFS.filter(d => d.track === track);
  const reservedLeaders = getReservedLeaderIds(state);
  const hired = state.hiredCommanders || [];
  const workforceBonuses = getProgramWorkforceBonuses(state);
  const activeBonusEntries = Object.entries(workforceBonuses).filter(([, v]) => v > 0);

  const eligibleCommanders = track === 'rd_residency'
    ? hired.filter(h => {
        const def = COMMANDER_MAP.get(h.definitionId);
        return def && (def.class === 'scientist' || def.class === 'engineer') && !reservedLeaders.has(h.definitionId);
      })
    : hired.filter(h => !reservedLeaders.has(h.definitionId));

  const handleEnqueue = () => {
    if (queue.length >= capacity) { playSound('error'); return; }
    if (track === 'crew_cohort') {
      if (!cohortDefPick) return;
      onUpdateState(prev => enqueueProgram(prev, track, cohortDefPick).state);
      playSound('build_start');
      setCohortDefPick('');
    } else {
      const defId = track === 'leader_development' ? 'leadership_development_program' : 'rd_residency_program';
      if (!commanderPick) return;
      if (track === 'rd_residency' && !categoryPick) return;
      onUpdateState(prev => enqueueProgram(prev, track, defId, { targetCommanderId: commanderPick, targetCategory: categoryPick || undefined }).state);
      playSound('build_start');
      setCommanderPick('');
      setCategoryPick('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="hud-frame relative flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <GameIcon name="track-crew-cohort" size={16} />
          <span className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            <Concept id="program-track">Programs</Concept>
          </span>
        </div>
        <span className="text-[10px] text-slate-500">Wall-clock training — ticks while you&apos;re away</span>
      </div>

      {/* Active workforce bonuses from completed cohorts */}
      {activeBonusEntries.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-white text-xs font-bold mb-2">
            <Concept id="workforce-bonus">Completed Cohort Bonuses</Concept>
          </p>
          <div className="flex flex-wrap gap-2">
            {activeBonusEntries.map(([field, val]) => (
              <span key={field} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {BONUS_FIELD_LABEL[field] || field} +{Math.round(val * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Track tabs */}
      <div className="flex rounded-lg border border-white/[0.08] overflow-hidden w-fit">
        {(Object.keys(TRACK_LABEL) as ProgramTrack[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTrack(t)}
            className={`px-3 py-1.5 text-xs min-h-[36px] flex items-center gap-1.5 ${track === t ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <GameIcon name={TRACK_ICON[t]} size={14} />
            {TRACK_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-cyan-300 text-xs uppercase tracking-wider font-semibold">{TRACK_LABEL[track]} Queue</p>
          <HoloTip
            underline={false}
            content={{
              title: 'Track Capacity',
              icon: TRACK_ICON[track],
              body: 'Each program track runs one wall-clock channel per queued slot — training ticks in real time whether or not you\'re logged in, up to this track\'s slot capacity.',
            }}
          >
            <span className="game-number text-xs text-slate-400">{queue.length}/{capacity} slots</span>
          </HoloTip>
        </div>

        {queue.length === 0 ? (
          <p className="text-slate-500 text-xs mb-3">No programs queued on this track.</p>
        ) : (
          <ul className="space-y-1.5 mb-3" aria-label={`${TRACK_LABEL[track]} queue`}>
            {queue.map((inst, idx) => {
              const commanderName = inst.targetCommanderId ? COMMANDER_MAP.get(inst.targetCommanderId)?.name : undefined;
              const category = inst.targetCategory ? RESEARCH_CATEGORIES.find(c => c.id === inst.targetCategory)?.name : undefined;
              const isActive = inst.startedAtMs !== null;
              const etaMs = isActive ? (inst.startedAtMs as number) + inst.durationMs - now : null;
              return (
                <li key={inst.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
                  <GameIcon name={TRACK_ICON[track]} size={14} />
                  <span className="flex-1 min-w-0">
                    <span className="text-white text-xs truncate block">
                      {idx + 1}. {commanderName ? `${commanderName} — ${inst.label}` : inst.label}
                      {category ? ` (${category})` : ''}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {isActive ? formatEta(etaMs as number) : 'Queued — starts when the track frees'}
                    </span>
                  </span>
                  {!isActive && (
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdateState(prev => reorderProgram(prev, track, inst.id, 'up'))}
                        disabled={idx <= 1}
                        aria-label={`Move ${inst.label} earlier in queue`}
                        className="min-w-[32px] min-h-[32px] rounded border border-white/[0.08] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => onUpdateState(prev => reorderProgram(prev, track, inst.id, 'down'))}
                        disabled={idx === queue.length - 1}
                        aria-label={`Move ${inst.label} later in queue`}
                        className="min-w-[32px] min-h-[32px] rounded border border-white/[0.08] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >▼</button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => { onUpdateState(prev => dequeueProgram(prev, track, inst.id)); playSound('error'); }}
                    aria-label={`Remove ${inst.label} from queue`}
                    className="min-w-[32px] min-h-[32px] rounded border border-red-500/20 text-red-400 hover:bg-red-500/10"
                  >✕</button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Add form */}
        {track === 'crew_cohort' ? (
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-white/[0.06]">
            <select
              value={cohortDefPick}
              onChange={e => setCohortDefPick(e.target.value)}
              aria-label="Choose cohort program"
              className="flex-1 min-w-[220px] min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
            >
              <option value="">Choose a cohort…</option>
              {trackDefs.map(def => {
                const wf = state.workforce;
                const have = wf && def.workerType ? ((wf as unknown as Record<string, number>)[`${def.workerType}s`] || 0) : 0;
                const affordable = state.money >= (def.upfrontCost || 0) && have >= (def.crewRequired || 0);
                return (
                  <option key={def.id} value={def.id} disabled={!affordable}>
                    {def.icon} {def.name} — {def.crewRequired} {def.workerType}(s), {def.durationDays}d, {formatMoney(def.upfrontCost || 0)}{!affordable ? ' (unavailable)' : ''}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={handleEnqueue}
              disabled={queue.length >= capacity || !cohortDefPick}
              className="min-h-[36px] px-3 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Queue
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-white/[0.06]">
            <select
              value={commanderPick}
              onChange={e => setCommanderPick(e.target.value)}
              aria-label="Choose commander to post"
              className="flex-1 min-w-[200px] min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
            >
              <option value="">Choose a leader…</option>
              {eligibleCommanders.map(h => {
                const def = COMMANDER_MAP.get(h.definitionId);
                if (!def) return null;
                const activeDefId = track === 'leader_development' ? 'leadership_development_program' : 'rd_residency_program';
                const cost = PROGRAM_DEF_MAP.get(activeDefId)?.costByRarity?.[def.rarity] || 0;
                return (
                  <option key={h.definitionId} value={h.definitionId} disabled={state.money < cost}>
                    {def.name} — {RARITY_LABEL[def.rarity]} {CLASS_LABEL[def.class]}{h.secondTraitSlot ? ' (has 2nd trait)' : ''} — {formatMoney(cost)}
                  </option>
                );
              })}
            </select>
            {track === 'rd_residency' && (
              <select
                value={categoryPick}
                onChange={e => setCategoryPick(e.target.value)}
                aria-label="Choose research category theme"
                className="min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
              >
                <option value="">Choose category…</option>
                {RESEARCH_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            )}
            <button
              type="button"
              onClick={handleEnqueue}
              disabled={queue.length >= capacity || !commanderPick || (track === 'rd_residency' && !categoryPick)}
              className="min-h-[36px] px-3 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Post
            </button>
          </div>
        )}
        {eligibleCommanders.length === 0 && track !== 'crew_cohort' && (
          <p className="text-slate-500 text-[10px] mt-2">
            {track === 'rd_residency' ? 'No available scientist/engineer leaders — hire one or free one from another posting.' : 'No available leaders — hire one or free one from another posting.'}
          </p>
        )}
      </div>

      {/* Retirement watch */}
      {hired.some(h => getRetirementEtaMs(h) !== null) && (
        <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <p className="text-fuchsia-300 text-xs uppercase tracking-wider font-semibold mb-2">
            <Concept id="leader-retirement">Retirement Watch</Concept>
          </p>
          <ul className="space-y-1">
            {hired.filter(h => getRetirementEtaMs(h) !== null).map(h => {
              const def = COMMANDER_MAP.get(h.definitionId);
              const eta = getRetirementEtaMs(h) as number;
              return (
                <li key={h.definitionId} className="flex items-center justify-between text-[11px]">
                  <span className="text-white">{def?.name || h.definitionId}</span>
                  <span className="text-slate-400">{formatEta(eta - now)}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-slate-500 text-[10px] mt-2">Two real months of continuous assignment triggers retirement with a legacy grant and a mentor boost for the next same-class hire. Reassigning to a different post resets the clock.</p>
        </div>
      )}
    </div>
  );
}
