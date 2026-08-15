'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  getReturningCommanderObjectives,
  getReturningCommanderMultiplier,
  isReturningCommanderTrackActive,
} from '@/lib/game/returning-commander';

/**
 * ReturningCommanderWidget — Live-Service Wave LS2 "Returning Commander"
 * (docs/LIVE_SERVICE_2026-08.md §LS2 mechanic 2). Dashboard-tab widget shown
 * only while a track is active (returning-commander.ts): the 4 re-entry
 * objectives (one per CLAUDE.md time loop) and the current decaying
 * earnings-boost multiplier. Renders nothing once the track has fully
 * expired (both the 7-day objective window AND the 14-day boost decay).
 */
export default function ReturningCommanderWidget({ state }: { state: GameState }) {
  // Re-render every 30s so the decaying boost % and objective completion
  // (which can change from other tabs) stay live without a full game tick.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!state.returningCommanderTrack || !isReturningCommanderTrackActive(state)) return null;

  const objectives = getReturningCommanderObjectives(state);
  const multiplier = getReturningCommanderMultiplier(state);
  const done = objectives.filter(o => o.done).length;
  const boostPct = Math.round((multiplier - 1) * 100);
  const now = Date.now();
  const objectivesOpen = now < state.returningCommanderTrack.expiresAtMs;
  const daysLeft = Math.max(0, Math.ceil((state.returningCommanderTrack.expiresAtMs - now) / 86_400_000));

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 hud-frame hud-frame-amber">
      <div className="flex items-center justify-between mb-2">
        <span className="text-amber-300 text-xs font-semibold uppercase tracking-wide">🎖 Returning Commander</span>
        {boostPct > 0 && (
          <span className="text-[10px] font-mono text-green-400">+{boostPct}% revenue boost</span>
        )}
      </div>
      {objectivesOpen ? (
        <>
          <p className="text-slate-400 text-[11px] mb-2">
            {done}/{objectives.length} re-entry objectives complete · {daysLeft} day{daysLeft === 1 ? '' : 's'} left this week
          </p>
          <ul className="space-y-1">
            {objectives.map(o => (
              <li key={o.id} className="flex items-center gap-2 text-[11px]">
                <span aria-hidden="true">{o.done ? '✅' : '⬜'}</span>
                <span className={o.done ? 'text-slate-500 line-through' : 'text-slate-300'}>{o.label}</span>
                <span className="text-slate-600 text-[9px] uppercase ml-auto">{o.loop}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-slate-400 text-[11px]">
          Your re-entry earnings boost is still winding down — no more objectives to complete this trip.
        </p>
      )}
    </div>
  );
}
