'use client';

// ─── Order Queue HUD (Wave 9 — map-first command interface) ────────────────
// Top-left overlay strip on the command map showing every order currently in
// progress — constructions, ship transits, mining operations, and survey
// expeditions — at a glance. Purely derivative of existing GameState (no new
// state introduced); each chip is clickable and re-focuses the map on the
// location the order is happening at, driving the same context-panel
// selection the canvas click / keyboard list use.

import { BUILDING_MAP } from '@/lib/game/buildings';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { formatCountdown } from '@/lib/game/formulas';
import { getExpeditionProgress } from '@/lib/game/expeditions';
import { SHIP_MAP } from '@/lib/game/ships';
import { TICK_INTERVALS, TICKS_PER_GAME_MONTH } from '@/lib/game/constants';
import type { GameState } from '@/lib/game/types';

/** Real seconds per game-month at 1x speed (30 ticks × 2s/tick) — same
 *  convention documented in constants.ts and expeditions.ts. */
const REAL_SECONDS_PER_GAME_MONTH = TICKS_PER_GAME_MONTH * (TICK_INTERVALS[1] / 1000);

export type OrderQueueTarget = { kind: 'location'; id: string } | { kind: 'system'; id: string };

interface OrderQueueItem {
  id: string;
  icon: string;
  label: string;
  sub: string;
  pct: number | null;      // null = no completion percentage (continuous op)
  etaSeconds: number | null;
  target: OrderQueueTarget;
}

function buildOrderQueue(state: GameState): OrderQueueItem[] {
  const items: OrderQueueItem[] = [];
  const nowMs = Date.now();

  // Constructions in progress
  for (const b of state.buildings) {
    if (b.isComplete) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    const loc = LOCATION_MAP.get(b.locationId);
    const elapsed = (nowMs - (b.startedAtMs || 0)) / 1000;
    const total = b.realDurationSeconds || 1;
    const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
    items.push({
      id: `build-${b.instanceId}`,
      icon: '🏗️',
      label: def?.name || 'Building',
      sub: loc?.name || b.locationId,
      pct,
      etaSeconds: Math.max(0, total - elapsed),
      target: { kind: 'location', id: b.locationId },
    });
  }

  for (const s of state.ships || []) {
    if (!s.isBuilt) continue;
    if (s.status === 'in_transit' && s.route) {
      const toLoc = LOCATION_MAP.get(s.route.to);
      const total = Math.max(1, s.route.arrivalAtMs - s.route.departedAtMs);
      const elapsed = nowMs - s.route.departedAtMs;
      const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
      items.push({
        id: `ship-transit-${s.instanceId}`,
        icon: '🚀',
        label: s.name,
        sub: `→ ${toLoc?.name || s.route.to}`,
        pct,
        etaSeconds: Math.max(0, (s.route.arrivalAtMs - nowMs) / 1000),
        target: { kind: 'location', id: s.route.to },
      });
    } else if (s.status === 'mining' && s.miningOperation) {
      const loc = LOCATION_MAP.get(s.miningOperation.locationId);
      items.push({
        id: `ship-mining-${s.instanceId}`,
        icon: '⛏️',
        label: s.name,
        sub: `Mining ${s.miningOperation.resourceId.replace(/_/g, ' ')} · ${loc?.name || s.miningOperation.locationId}`,
        pct: null,
        etaSeconds: null,
        target: { kind: 'location', id: s.miningOperation.locationId },
      });
    } else if (s.status === 'surveying' && s.surveyExpedition) {
      const loc = LOCATION_MAP.get(s.surveyExpedition.targetLocation);
      const elapsed = (nowMs - s.surveyExpedition.startedAtMs) / 1000;
      const total = s.surveyExpedition.durationSeconds || 1;
      const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
      items.push({
        id: `ship-survey-${s.instanceId}`,
        icon: '📡',
        label: s.name,
        sub: `Surveying ${loc?.name || s.surveyExpedition.targetLocation}`,
        pct,
        etaSeconds: Math.max(0, total - elapsed),
        target: { kind: 'location', id: s.surveyExpedition.targetLocation },
      });
    }
  }

  // Interstellar expeditions in flight (Wave 10) — outbound/exploring/returning.
  for (const exp of state.expeditions || []) {
    if (exp.phase !== 'outbound' && exp.phase !== 'exploring' && exp.phase !== 'returning') continue;
    const progress = getExpeditionProgress(state, exp.id);
    if (!progress) continue;
    const shipDef = SHIP_MAP.get(exp.shipDefinitionId);
    const etaSeconds = progress.monthsRemaining > 0 ? progress.monthsRemaining * REAL_SECONDS_PER_GAME_MONTH : null;
    items.push({
      id: `expedition-${exp.id}`,
      icon: shipDef?.icon || '🌠',
      label: shipDef?.name || 'Expedition',
      sub: `${progress.phaseLabel} · ${progress.systemName}`,
      pct: Math.round(progress.progressPct * 100),
      etaSeconds,
      target: { kind: 'system', id: exp.targetSystemId },
    });
  }

  // Soonest-completing orders first; continuous ops (null ETA) sort last.
  items.sort((a, b) => (a.etaSeconds ?? Infinity) - (b.etaSeconds ?? Infinity));
  return items;
}

interface OrderQueueHUDProps {
  state: GameState;
  onSelect: (target: OrderQueueTarget) => void;
  className?: string;
}

export default function OrderQueueHUD({ state, onSelect, className }: OrderQueueHUDProps) {
  const items = buildOrderQueue(state);
  if (items.length === 0) return null;

  return (
    <div
      className={`hud-frame rounded-xl border border-white/[0.06] bg-[#050510]/90 backdrop-blur-sm ${className || ''}`}
      role="region"
      aria-label={`Order queue — ${items.length} active order${items.length === 1 ? '' : 's'}`}
    >
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto max-w-[calc(100vw-1rem)] sm:max-w-[60vw]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold shrink-0 px-1">Orders</span>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.target)}
            className="shrink-0 min-h-[44px] flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-500/30 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-cyan-400"
            title={`${item.label} — ${item.sub}`}
          >
            <span aria-hidden="true" className="text-sm">{item.icon}</span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] text-white font-medium truncate max-w-[110px]">{item.label}</span>
              <span className="text-[9px] text-slate-400 truncate max-w-[110px]">
                {item.sub}
                {item.etaSeconds !== null && <span className="text-cyan-300/80"> · {formatCountdown(item.etaSeconds)}</span>}
              </span>
            </span>
            {item.pct !== null && (
              <span className="w-6 h-6 relative shrink-0" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                  <circle
                    cx="12" cy="12" r="10" fill="none" stroke="#22d3ee" strokeWidth="3"
                    strokeDasharray={`${(item.pct / 100) * 62.8} 62.8`}
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
