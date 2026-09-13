// ─── Space Tycoon: Bridge events (CC-1) ─────────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §4 — "a `useBridgeEvents` hook
// maps game events (launch fired, ship arrived, hazard started, build
// completed) to actors with cooldowns so the window never becomes a strobe."
//
// The detection is pure (prev state, next state, now) → triggers, so it is
// unit-tested without React; the hook at the bottom is a thin wrapper that
// diffs successive states and applies the cooldowns. Actor names come from
// the stage manifest (hq-manifest.ts); this file only knows TRIGGER names,
// which the manifest's actors declare (`"trigger": "launch"`).
//
// Signals (cheapest reliable ones in the engine, see game-engine.ts):
//   launch          — the game month rolled while a launch service was
//                     active (launch services pay per month, so a month
//                     roll IS the launch); a launch contract completed; or a
//                     launch service came online (first flight off the pad).
//   build_complete  — a building's isComplete flipped false → true.
//   weather         — a state, not a pulse: a solar-storm/micrometeorite
//                     strike in the last WEATHER_ACTIVE_MS, or a severe
//                     solar-storm forecast still pending. Rendered while
//                     active, no cooldown.

import { useEffect, useRef, useState } from 'react';
import type { GameState } from './types';
import { SERVICE_MAP } from './services';

export type BridgeTrigger = 'launch' | 'build_complete';

/** Minimum real-time gap between two firings of the same trigger. */
export const BRIDGE_TRIGGER_COOLDOWN_MS: Record<BridgeTrigger, number> = {
  launch: 60_000,
  build_complete: 20_000,
};

/** A hazard strike keeps the weather actor on for this long. */
export const WEATHER_ACTIVE_MS = 3 * 60_000;

/** Hazard types the window renders as weather (the rest — pirate raids,
 *  equipment failures — are not visible from the Earth centre). */
const WEATHER_HAZARDS = new Set(['solar_storm', 'micrometeorite']);

function isLaunchService(definitionId: string): boolean {
  return SERVICE_MAP.get(definitionId)?.type === 'launch_payload';
}

function hasLaunchService(state: GameState): boolean {
  return (state.activeServices || []).some(s => isLaunchService(s.definitionId));
}

/** Contract definition ids that are launches (contracts.ts ids are
 *  prefixed `c_`; the launch family carries "launch" in the id). Kept as a
 *  cheap predicate so the diff never loads the contract catalogue. */
export function isLaunchContractId(id: string): boolean {
  return /launch/i.test(id);
}

/** Pure diff: which pulse triggers fired between `prev` and `next`. The
 *  first observation (prev = null) never fires — a returning player should
 *  not see every building in the save "complete" at once. */
export function detectBridgeTriggers(prev: GameState | null, next: GameState): BridgeTrigger[] {
  if (!prev || prev === next) return [];
  const fired = new Set<BridgeTrigger>();

  // build_complete: any building that was in progress and now is not.
  const prevComplete = new Map<string, boolean>();
  for (const b of prev.buildings || []) prevComplete.set(b.instanceId, !!b.isComplete);
  for (const b of next.buildings || []) {
    if (b.isComplete && prevComplete.get(b.instanceId) === false) { fired.add('build_complete'); break; }
  }

  // launch (a): month rolled with a launch service active.
  const monthRolled = prev.gameDate.year !== next.gameDate.year || prev.gameDate.month !== next.gameDate.month;
  if (monthRolled && hasLaunchService(next)) fired.add('launch');

  // launch (b): a launch contract completed.
  if (!fired.has('launch')) {
    const before = new Set(prev.completedContracts || []);
    for (const id of next.completedContracts || []) {
      if (!before.has(id) && isLaunchContractId(id)) { fired.add('launch'); break; }
    }
  }

  // launch (c): a launch service came online.
  if (!fired.has('launch')) {
    const before = new Set((prev.activeServices || []).map(s => s.definitionId));
    for (const s of next.activeServices || []) {
      if (!before.has(s.definitionId) && isLaunchService(s.definitionId)) { fired.add('launch'); break; }
    }
  }

  return Array.from(fired);
}

/** Weather is a state: on while a visible hazard is recent or forecast. */
export function isWeatherActive(state: GameState, nowMs: number): boolean {
  for (const h of state.recentHazards || []) {
    if (WEATHER_HAZARDS.has(h.type) && nowMs - h.occurredAtMs >= 0 && nowMs - h.occurredAtMs < WEATHER_ACTIVE_MS) return true;
  }
  for (const w of state.hazardWarnings || []) {
    if (w.type === 'solar_storm' && w.severity === 'severe') return true;
  }
  return false;
}

export type BridgeFiredAt = Partial<Record<BridgeTrigger, number>>;

/** Apply cooldowns: a trigger fires only if its last firing is older than
 *  its cooldown. Returns the triggers that fire now plus the updated map
 *  (a new object only when something fired, so React state stays stable). */
export function applyBridgeCooldowns(
  triggers: BridgeTrigger[],
  lastFiredAt: BridgeFiredAt,
  nowMs: number,
): { fire: BridgeTrigger[]; lastFiredAt: BridgeFiredAt } {
  const fire: BridgeTrigger[] = [];
  let next = lastFiredAt;
  for (const t of triggers) {
    const last = lastFiredAt[t];
    if (typeof last === 'number' && nowMs - last < BRIDGE_TRIGGER_COOLDOWN_MS[t]) continue;
    if (next === lastFiredAt) next = { ...lastFiredAt };
    next[t] = nowMs;
    fire.push(t);
  }
  return { fire, lastFiredAt: next };
}

export interface BridgeEvents {
  /** Real-clock ms each pulse trigger last fired (0 = never this session). */
  firedAt: BridgeFiredAt;
  /** The weather actor is on. */
  weatherActive: boolean;
  /** A vehicle should sit on the pad: a launch service is active. */
  vehicleOnPad: boolean;
}

/** React wrapper: diffs each state against the previous one, applies the
 *  cooldowns, and re-evaluates weather on a slow timer so a strike ages out
 *  even when the state object is quiet. */
export function useBridgeEvents(state: GameState | null, nowFn: () => number = Date.now): BridgeEvents {
  const prevRef = useRef<GameState | null>(null);
  const [firedAt, setFiredAt] = useState<BridgeFiredAt>({});
  const [weatherActive, setWeatherActive] = useState(false);

  useEffect(() => {
    if (!state) return;
    const now = nowFn();
    const triggers = detectBridgeTriggers(prevRef.current, state);
    prevRef.current = state;
    if (triggers.length > 0) {
      setFiredAt(prev => applyBridgeCooldowns(triggers, prev, now).lastFiredAt);
    }
    setWeatherActive(isWeatherActive(state, now));
  }, [state, nowFn]);

  // Age weather out without a state change.
  useEffect(() => {
    if (!state || !weatherActive) return;
    const id = setInterval(() => setWeatherActive(isWeatherActive(state, nowFn())), 15_000);
    return () => clearInterval(id);
  }, [state, weatherActive, nowFn]);

  return { firedAt, weatherActive, vehicleOnPad: !!state && hasLaunchService(state) };
}
