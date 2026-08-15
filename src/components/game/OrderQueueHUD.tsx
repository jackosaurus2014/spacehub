'use client';

// ─── Order Queue HUD (Wave 9 — map-first command interface) ────────────────
// Top-left overlay strip on the command map showing every order currently in
// progress — constructions, ship transits, mining operations, and survey
// expeditions — at a glance. Purely derivative of existing GameState (no new
// state introduced); each chip is clickable and re-focuses the map on the
// location the order is happening at, driving the same context-panel
// selection the canvas click / keyboard list use.

import { formatCountdown } from '@/lib/game/formulas';
import type { GameState } from '@/lib/game/types';
import GameIcon from './GameIcon';
// V3 (docs/VISUAL_DEPTH_2026-08.md §V3): the derivation moved to
// order-queue.ts so the persistent Outliner's "Operations" section can
// share the EXACT same pure function — "one derivation, two renderers"
// (this HUD strip + Outliner.tsx's tree rows).
import { buildOrderQueue, type OrderQueueTarget } from '@/lib/game/order-queue';

export type { OrderQueueTarget };

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
            <GameIcon name={item.icon} size={15} />
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
