'use client';

// ─── Situation Log (Wave V3, docs/VISUAL_DEPTH_2026-08.md §V3) ─────────────
// "A unified Situation Log replaces scattered alerts." Promoted content of
// the Reports tab (ReportsPanel.tsx absorbs this as a top-level sub-tab) —
// a filterable, category-colored feed over lib/game/situation-log.ts's pure
// derivation. HazardAlertLayer/FeatureUnlockToast remain the transient
// toasts; this is the permanent, browsable record those don't provide.

import { useEffect, useMemo, useState } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import { deriveSituationLog, type SituationCategory, type SituationItem, type SituationSeverity } from '@/lib/game/situation-log';
import type { OrderQueueTarget } from '@/lib/game/order-queue';
import { requestSubView } from '@/lib/game/sub-view';
import GameIcon from './GameIcon';
import { ConsolePanel, DataChip } from './chrome';

const TICK_MS = 30 * 1000; // countdown refresh — text only, no animation

const CATEGORY_LABEL: Record<SituationCategory, string> = {
  hazard_recent: 'Hazard',
  hazard_forecast: 'Hazard Forecast',
  contract: 'Contract',
  senate: 'Accord Senate',
  charter: 'Charter',
  story_chapter: 'Story Chapter',
  economic_cycle: 'Super-Cycle',
  queue_idle: 'Command Queue',
  mail: 'Mail',
  supply_shortfall: 'Supply Line',
  demand_shift: 'Market Share',
  building_damage: 'Building',
  ship_damage: 'Fleet',
  ship_idle: 'Fleet',
  queue_stalled: 'Command Queue',
  // Wave E5 (docs/ECONOMY_PVP_2026-08.md §E5)
  deposit_depletion: 'Deposit',
  wage_spike: 'Labor Market',
  // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7)
  slot_auction: 'Orbital Slot',
  procurement_drive: 'NPC Drive',
  // Wave M2 (docs/MEANINGFUL_2026-08.md §M2)
  building_status: 'Building Status',
  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6)
  equity: 'Equity',
  // Wave M5 (docs/MEANINGFUL_2026-08.md §M5 — the offense toolkit)
  economic_attack: 'Economic Attack',
  poach_offer: 'Poach Offer',
  lane_toll: 'Freight Toll',
  // PvP Discoverability pass (competitive-posture.ts)
  competitive_signal: 'Competitive',
  // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md)
  systemic_crisis: 'Accord Emergency',
  quarter_closed: 'Quarter Closed',
};

const CATEGORY_FRAME: Record<SituationCategory, string> = {
  hazard_recent: 'border-red-500/25 bg-red-500/[0.03]',
  hazard_forecast: 'border-amber-500/25 bg-amber-500/[0.03]',
  contract: 'border-orange-500/25 bg-orange-500/[0.03]',
  senate: 'border-purple-500/25 bg-purple-500/[0.03]',
  charter: 'border-teal-500/25 bg-teal-500/[0.03]',
  story_chapter: 'border-violet-500/25 bg-violet-500/[0.03]',
  economic_cycle: 'border-lime-500/25 bg-lime-500/[0.03]',
  queue_idle: 'border-slate-500/25 bg-slate-500/[0.03]',
  mail: 'border-cyan-500/25 bg-cyan-500/[0.03]',
  supply_shortfall: 'border-amber-500/25 bg-amber-500/[0.03]',
  demand_shift: 'border-cyan-500/25 bg-cyan-500/[0.03]',
  building_damage: 'border-red-500/25 bg-red-500/[0.03]',
  ship_damage: 'border-red-500/25 bg-red-500/[0.03]',
  ship_idle: 'border-slate-500/25 bg-slate-500/[0.03]',
  queue_stalled: 'border-amber-500/25 bg-amber-500/[0.03]',
  // Wave E5 (docs/ECONOMY_PVP_2026-08.md §E5)
  deposit_depletion: 'border-orange-500/25 bg-orange-500/[0.03]',
  wage_spike: 'border-amber-500/25 bg-amber-500/[0.03]',
  // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7)
  slot_auction: 'border-cyan-500/25 bg-cyan-500/[0.03]',
  procurement_drive: 'border-teal-500/25 bg-teal-500/[0.03]',
  // Wave M2 (docs/MEANINGFUL_2026-08.md §M2)
  building_status: 'border-slate-500/25 bg-slate-500/[0.03]',
  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6)
  equity: 'border-purple-500/25 bg-purple-500/[0.03]',
  // Wave M5 (docs/MEANINGFUL_2026-08.md §M5 — the offense toolkit)
  economic_attack: 'border-red-500/25 bg-red-500/[0.03]',
  poach_offer: 'border-red-500/25 bg-red-500/[0.03]',
  lane_toll: 'border-amber-500/25 bg-amber-500/[0.03]',
  // PvP Discoverability pass — deliberately the calmest frame in the table:
  // an opportunity must never read as an alarm.
  competitive_signal: 'border-indigo-500/25 bg-indigo-500/[0.03]',
  // AAA Round 2 — the same amber the hazard FORECAST uses, because a crisis
  // is the same class of thing at world scale: a warning with a clock on it.
  // Severity (and therefore the row's tone chip and its ordering) still
  // carries the urgency; the frame is category identity only, never the
  // sole carrier of state.
  systemic_crisis: 'border-amber-500/25 bg-amber-500/[0.03]',
  quarter_closed: 'border-cyan-500/25 bg-cyan-500/[0.03]',
};

const SEVERITY_TONE: Record<SituationSeverity, 'bad' | 'warn' | 'info'> = {
  critical: 'bad',
  warning: 'warn',
  info: 'info',
};

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Now';
  const totalMinutes = Math.floor(msRemaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface SituationLogProps {
  state: GameState;
  onNavigate: (tab: GameTab) => void;
  onFocusMap: (target: OrderQueueTarget) => void;
  /** Compact mode drops the ConsolePanel header (used when embedded inside
   *  the Outliner's mobile sheet, which already has its own chrome). */
  compact?: boolean;
}

export default function SituationLog({ state, onNavigate, onFocusMap, compact }: SituationLogProps) {
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<SituationCategory | 'all'>('all');

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const items = useMemo(
    () => deriveSituationLog(state, { nowMs: now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.hazardWarnings, state.recentHazards, state.activeDeliveries, state.accordDocket,
      state.corporateEras, state.commandQueue, state.reports, state.storyChapters,
      // PvP Discoverability pass — the snapshots the competitive signals read.
      state.demandPools, state.laborMarket, state.marketSnapshot,
      state.orbitalSlotOccupancy, state.orbitalSlotLeases, state.offense, now],
  );

  const presentCategories = useMemo(() => {
    const set = new Set<SituationCategory>();
    for (const i of items) set.add(i.category);
    return Array.from(set);
  }, [items]);

  const visible = filter === 'all' ? items : items.filter(i => i.category === filter);

  const handleActivate = (item: SituationItem) => {
    if (!item.tab) return;
    // PvP Discoverability pass: park the sub-view request BEFORE navigating,
    // so the hub panel picks it up on the mount that the setTab triggers.
    // Items without a token behave exactly as they did before.
    if (item.subView) requestSubView(item.subView);
    if (item.tab === 'map' && item.target) {
      onFocusMap(item.target);
    } else {
      onNavigate(item.tab);
    }
  };

  const body = (
    <div className="space-y-3">
      {presentCategories.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`min-h-[32px] px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
              filter === 'all' ? 'bg-white/[0.1] text-white border-white/20' : 'text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            All ({items.length})
          </button>
          {presentCategories.map(cat => {
            const count = items.filter(i => i.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                aria-pressed={filter === cat}
                className={`min-h-[32px] px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors flex items-center gap-1 ${
                  filter === cat ? 'bg-white/[0.1] text-white border-white/20' : 'text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <GameIcon name={items.find(i => i.category === cat)!.icon} size={11} />
                {CATEGORY_LABEL[cat]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-slate-500 text-[11px] py-4 text-center">
          Nothing needs your attention right now.
        </p>
      ) : (
        <div className="space-y-1.5" role="list" aria-label="Situation log entries">
          {visible.map(item => {
            const clickable = !!item.tab;
            return (
              <div
                key={item.id}
                role={clickable ? 'button' : 'listitem'}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => handleActivate(item) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(item); } } : undefined}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] border text-left transition-colors ${CATEGORY_FRAME[item.category]} ${
                  clickable ? 'hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer' : ''
                }`}
                style={{ minHeight: 44 }}
              >
                <span className="shrink-0"><GameIcon name={item.icon} size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="game-label mr-2 text-slate-400">{CATEGORY_LABEL[item.category]}</span>
                  <span className="text-slate-200">{item.label}</span>
                  <span className="block text-slate-500 text-[10px] mt-0.5">{item.detail}</span>
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <DataChip tone={SEVERITY_TONE[item.severity]} className="uppercase tracking-wide">
                    {item.severity}
                  </DataChip>
                  {item.atMs !== undefined && (
                    <span className="text-slate-500 text-[10px] font-hud">{formatCountdown(item.atMs - now)}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <ConsolePanel
      title="Situation Log"
      icon="warning"
      subtitle="Everything that needs a decision — hazards, contracts, senate votes, and command-queue status — in one filterable feed."
    >
      {body}
    </ConsolePanel>
  );
}
