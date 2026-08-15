'use client';

// ─── Standing Orders Panel (Live-Service Wave LS1 "Night Shift") ───────────
// docs/LIVE_SERVICE_2026-08.md §LS1 item 4 (UI). Shows the command queue,
// standing directives + their ops-fee cost, current away-efficiency, and the
// last away-operations debrief data. Lives inside the Fleet tab (page.tsx) —
// LS1 deliberately does NOT add a 29th top-level tab per the spec.
//
// Self-contained: rather than threading ~10 new named callback props through
// the already-very-large space-tycoon/page.tsx (handleBuild, handleStartResearch,
// etc.), this panel takes one generic `onUpdateState` updater and calls the
// pure functions in command-queue.ts / standing-directives.ts directly —
// minimal page.tsx wiring per the task brief.

import { useState } from 'react';
import type { GameState, StandingDirectiveType } from '@/lib/game/types';
import { RESEARCH, getResearchDisplayState } from '@/lib/game/research-tree';
import { BUILDINGS, BUILDING_MAP } from '@/lib/game/buildings';
import { RESOURCES, RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { formatMoney } from '@/lib/game/formulas';
import {
  getCommandQueueCapacity, enqueueResearchOrder, enqueueBuildOrder, dequeueOrder, reorderQueueOrder,
} from '@/lib/game/command-queue';
import {
  getDirectiveOpsFee, addDirective, removeDirective, setDirectiveActive, getDirectiveTypeLabel, MAX_STANDING_DIRECTIVES,
} from '@/lib/game/standing-directives';
import { getAwayEfficiencyInvestmentBonus, getAwayEfficiencyTierForHours } from '@/lib/game/away-operations';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from '@/components/game/GameIcon';
import type { IconName } from '@/lib/game/icons';

interface StandingOrdersPanelProps {
  state: GameState;
  onUpdateState: (updater: (prev: GameState) => GameState) => void;
}

const QUEUE_ICON: Record<string, IconName> = {
  research: 'research', build: 'build', ship_dispatch: 'fleet', craft: 'crafting', service_activate: 'services',
};

const AWAY_PREVIEW_HOURS = [1, 24, 72, 200]; // ~1h, 1d, 3d, 8d — one sample per tier

export default function StandingOrdersPanel({ state, onUpdateState }: StandingOrdersPanelProps) {
  const [addKind, setAddKind] = useState<'research' | 'build'>('research');
  const [researchPick, setResearchPick] = useState('');
  const [buildingPick, setBuildingPick] = useState('');
  const [locationPick, setLocationPick] = useState('');
  const [directiveType, setDirectiveType] = useState<StandingDirectiveType>('auto_sell');
  const [directiveResource, setDirectiveResource] = useState<string>(RESOURCES[0]?.id || '');
  const [directivePrice, setDirectivePrice] = useState(0);
  const [directiveCap, setDirectiveCap] = useState(0);
  const [directiveTarget, setDirectiveTarget] = useState(0);
  const [directiveReserve, setDirectiveReserve] = useState(0);

  const queue = state.commandQueue || [];
  const capacity = getCommandQueueCapacity(state);
  const directives = state.standingDirectives || [];
  const activeCount = directives.filter(d => d.active).length;
  const currentFee = getDirectiveOpsFee(activeCount);
  const nextFee = getDirectiveOpsFee(activeCount + 1);

  const investmentBonus = getAwayEfficiencyInvestmentBonus(state);

  const availableResearch = RESEARCH.filter(def => {
    const disp = getResearchDisplayState(def, state);
    return disp.visible && !disp.completed;
  });
  const availableBuildings = BUILDINGS.filter(def =>
    (state.unlockedLocations || []).includes(def.requiredLocation)
    && def.requiredResearch.every(r => state.completedResearch.includes(r))
  );

  const handleEnqueue = () => {
    if (queue.length >= capacity) { playSound('error'); return; }
    if (addKind === 'research') {
      if (!researchPick) return;
      onUpdateState(prev => enqueueResearchOrder(prev, researchPick).state);
      playSound('research_start');
      setResearchPick('');
    } else {
      const loc = locationPick || BUILDING_MAP.get(buildingPick)?.requiredLocation || '';
      if (!buildingPick || !loc) return;
      onUpdateState(prev => enqueueBuildOrder(prev, buildingPick, loc).state);
      playSound('build_start');
      setBuildingPick('');
    }
  };

  const handleAddDirective = () => {
    if (directives.length >= MAX_STANDING_DIRECTIVES) { playSound('error'); return; }
    if ((directiveType === 'auto_sell' || directiveType === 'auto_restock') && !directiveResource) { playSound('error'); return; }
    if (directiveType === 'maintenance_reserve' && directiveReserve <= 0) { playSound('error'); return; }

    const def = RESOURCE_MAP.get(directiveResource as ResourceId);
    const label = directiveType === 'maintenance_reserve'
      ? `Keep ${formatMoney(directiveReserve)} liquid`
      : directiveType === 'auto_renew_contract'
        ? `Auto-renew up to ${directiveCap || 3}/mo`
        : `${getDirectiveTypeLabel(directiveType)}: ${def?.name || directiveResource}`;

    onUpdateState(prev => addDirective(prev, {
      type: directiveType,
      label,
      resourceId: directiveType === 'auto_sell' || directiveType === 'auto_restock' ? directiveResource : undefined,
      minPrice: directiveType === 'auto_sell' ? directivePrice : undefined,
      maxPrice: directiveType === 'auto_restock' ? directivePrice : undefined,
      targetStock: directiveType === 'auto_restock' ? directiveTarget : undefined,
      maxUnitsPerMonth: directiveCap > 0 ? directiveCap : undefined,
      maxContractsPerMonth: directiveType === 'auto_renew_contract' && directiveCap > 0 ? directiveCap : undefined,
      reserveAmount: directiveType === 'maintenance_reserve' ? directiveReserve : undefined,
    }).state);
    playSound('milestone');
  };

  return (
    <div className="space-y-4">
      {/* Away-efficiency overview */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="text-cyan-300 text-xs uppercase tracking-wider font-semibold mb-2">Away Efficiency</p>
        <p className="text-slate-400 text-xs mb-3">
          No time cap — longer absences run your economy at a lower rate instead of freezing it. Automation research and workforce mix raise the ceiling.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AWAY_PREVIEW_HOURS.map(h => {
            const tier = getAwayEfficiencyTierForHours(h, investmentBonus);
            return (
              <div key={h} className="rounded-lg border border-white/[0.06] bg-black/20 p-2 text-center">
                <p className="game-number text-cyan-400 font-bold text-sm">{Math.round(tier.efficiency * 100)}%</p>
                <p className="text-slate-500 text-[10px]">{tier.label}</p>
              </div>
            );
          })}
        </div>
        {investmentBonus > 0 && (
          <p className="text-green-400 text-[10px] mt-2">+{Math.round(investmentBonus * 100)}% investment bonus from automation research &amp; operator workforce share (tiers 2-4, capped 85%).</p>
        )}
        {state.awayLedger && (
          <p className="text-slate-400 text-[11px] mt-3 border-t border-white/[0.06] pt-2">{state.awayLedger.message}</p>
        )}
      </div>

      {/* Command Queue */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-cyan-300 text-xs uppercase tracking-wider font-semibold">Command Queue</p>
          <span className="game-number text-xs text-slate-400">{queue.length}/{capacity} slots</span>
        </div>

        {queue.length === 0 ? (
          <p className="text-slate-500 text-xs mb-3">No queued orders. Research and construction slots idle the moment they free up — queue the next steps so they start automatically.</p>
        ) : (
          <ul className="space-y-1.5 mb-3" aria-label="Queued orders">
            {queue.map((order, idx) => (
              <li key={order.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
                <GameIcon name={QUEUE_ICON[order.kind] || 'clock'} size={14} />
                <span className="flex-1 min-w-0">
                  <span className="text-white text-xs truncate block">{idx + 1}. {order.label}</span>
                  <span className="text-slate-500 text-[10px] capitalize">{order.kind.replace('_', ' ')}{order.locationId ? ` · ${LOCATION_MAP.get(order.locationId)?.name || order.locationId}` : ''}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateState(prev => reorderQueueOrder(prev, order.id, 'up'))}
                  disabled={idx === 0}
                  aria-label={`Move ${order.label} earlier in queue`}
                  className="min-w-[32px] min-h-[32px] rounded border border-white/[0.08] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                >▲</button>
                <button
                  type="button"
                  onClick={() => onUpdateState(prev => reorderQueueOrder(prev, order.id, 'down'))}
                  disabled={idx === queue.length - 1}
                  aria-label={`Move ${order.label} later in queue`}
                  className="min-w-[32px] min-h-[32px] rounded border border-white/[0.08] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                >▼</button>
                <button
                  type="button"
                  onClick={() => { onUpdateState(prev => dequeueOrder(prev, order.id)); playSound('error'); }}
                  aria-label={`Remove ${order.label} from queue`}
                  className="min-w-[32px] min-h-[32px] rounded border border-red-500/20 text-red-400 hover:bg-red-500/10"
                >✕</button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-white/[0.06]">
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden shrink-0">
            <button type="button" onClick={() => setAddKind('research')}
              className={`px-2.5 py-1.5 text-xs min-h-[36px] ${addKind === 'research' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>Research</button>
            <button type="button" onClick={() => setAddKind('build')}
              className={`px-2.5 py-1.5 text-xs min-h-[36px] ${addKind === 'build' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>Build</button>
          </div>

          {addKind === 'research' ? (
            <select
              value={researchPick}
              onChange={e => setResearchPick(e.target.value)}
              aria-label="Choose research to queue"
              className="flex-1 min-w-[160px] min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
            >
              <option value="">Choose research…</option>
              {availableResearch.map(def => <option key={def.id} value={def.id}>{def.name}</option>)}
            </select>
          ) : (
            <>
              <select
                value={buildingPick}
                onChange={e => { setBuildingPick(e.target.value); setLocationPick(BUILDING_MAP.get(e.target.value)?.requiredLocation || ''); }}
                aria-label="Choose building to queue"
                className="flex-1 min-w-[160px] min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
              >
                <option value="">Choose building…</option>
                {availableBuildings.map(def => <option key={def.id} value={def.id}>{def.name} — {LOCATION_MAP.get(def.requiredLocation)?.name || def.requiredLocation}</option>)}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={handleEnqueue}
            disabled={queue.length >= capacity || (addKind === 'research' ? !researchPick : !buildingPick)}
            className="min-h-[36px] px-3 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Queue
          </button>
        </div>
      </div>

      {/* Standing Directives */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-cyan-300 text-xs uppercase tracking-wider font-semibold">Standing Directives</p>
          <span className={`game-number text-xs ${currentFee > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {formatMoney(currentFee)}/mo ops overhead
          </span>
        </div>
        <p className="text-slate-500 text-[10px] mb-3">
          Priced automation — each active directive raises the overhead fee for ALL of them (superlinear). Automating everything is never free.
        </p>

        {directives.length === 0 ? (
          <p className="text-slate-500 text-xs mb-3">No standing directives. Set an auto-sell threshold, restock policy, or contract auto-renew to run your economy hands-off.</p>
        ) : (
          <ul className="space-y-1.5 mb-3" aria-label="Standing directives">
            {directives.map(d => (
              <li key={d.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
                <span className="flex-1 min-w-0">
                  <span className={`text-xs truncate block ${d.active ? 'text-white' : 'text-slate-500 line-through'}`}>{d.label}</span>
                  <span className="text-slate-500 text-[10px]">{getDirectiveTypeLabel(d.type)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateState(prev => setDirectiveActive(prev, d.id, !d.active))}
                  aria-label={`${d.active ? 'Pause' : 'Resume'} ${d.label}`}
                  className={`min-h-[32px] px-2 rounded border text-[10px] font-semibold ${d.active ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-slate-500/30 text-slate-400 hover:bg-white/5'}`}
                >
                  {d.active ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={() => { onUpdateState(prev => removeDirective(prev, d.id)); playSound('error'); }}
                  aria-label={`Delete ${d.label}`}
                  className="min-w-[32px] min-h-[32px] rounded border border-red-500/20 text-red-400 hover:bg-red-500/10"
                >✕</button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-white/[0.06]">
          <select
            value={directiveType}
            onChange={e => setDirectiveType(e.target.value as StandingDirectiveType)}
            aria-label="Directive type"
            className="min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
          >
            <option value="auto_sell">Auto-Sell</option>
            <option value="auto_restock">Auto-Restock</option>
            <option value="auto_renew_contract">Auto-Renew Contracts</option>
            <option value="maintenance_reserve">Maintenance Reserve</option>
          </select>

          {(directiveType === 'auto_sell' || directiveType === 'auto_restock') && (
            <>
              <select
                value={directiveResource}
                onChange={e => setDirectiveResource(e.target.value)}
                aria-label="Resource"
                className="min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
              >
                {RESOURCES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input
                type="number"
                value={directivePrice}
                onChange={e => setDirectivePrice(Number(e.target.value))}
                placeholder={directiveType === 'auto_sell' ? 'Min price' : 'Max price'}
                aria-label={directiveType === 'auto_sell' ? 'Minimum sell price' : 'Maximum buy price'}
                className="w-24 min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
              />
              {directiveType === 'auto_restock' && (
                <input
                  type="number"
                  value={directiveTarget}
                  onChange={e => setDirectiveTarget(Number(e.target.value))}
                  placeholder="Target stock"
                  aria-label="Target stock level"
                  className="w-24 min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
                />
              )}
              <input
                type="number"
                value={directiveCap}
                onChange={e => setDirectiveCap(Number(e.target.value))}
                placeholder="Units/mo cap"
                aria-label="Units per month cap"
                className="w-24 min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
              />
            </>
          )}

          {directiveType === 'auto_renew_contract' && (
            <input
              type="number"
              value={directiveCap}
              onChange={e => setDirectiveCap(Number(e.target.value))}
              placeholder="Max contracts/mo (default 3)"
              aria-label="Maximum contracts per month"
              className="w-40 min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
            />
          )}

          {directiveType === 'maintenance_reserve' && (
            <input
              type="number"
              value={directiveReserve}
              onChange={e => setDirectiveReserve(Number(e.target.value))}
              placeholder="Reserve amount ($)"
              aria-label="Liquid reserve amount"
              className="w-36 min-h-[36px] rounded-lg bg-black/30 border border-white/[0.08] text-white text-xs px-2"
            />
          )}

          <button
            type="button"
            onClick={handleAddDirective}
            disabled={directives.length >= MAX_STANDING_DIRECTIVES}
            className="min-h-[36px] px-3 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add (next fee {formatMoney(nextFee)}/mo)
          </button>
        </div>
      </div>
    </div>
  );
}
