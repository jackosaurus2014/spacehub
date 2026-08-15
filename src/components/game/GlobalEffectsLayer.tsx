'use client';

// ─── Global Effects Layer (Wave V7 — order acknowledgment & world feedback) ─
// docs/VISUAL_DEPTH_2026-08.md §V7. Mounted ONCE at the page shell (see the
// single import + JSX line in space-tycoon/page.tsx) so completion feedback
// fires regardless of which tab the player is looking at — a building can
// finish while they're on the Research tab, and the map/outliner should
// still hear about it. Renders nothing: it's a pure `state`-diffing effect
// that turns "something just finished" into a mapPing (consumed by whichever
// map renderer happens to be mounted), a sound, and a haptic buzz.
//
// Every ping this component fires is a strict *reinforcement* of something
// already recorded elsewhere (the tick engine already pushed a `build_complete`
// eventLog entry for the same transition) — per CLAUDE.md's accessibility
// invariant, no information is conveyed ONLY by this layer.

import { useEffect, useRef } from 'react';
import type { GameState } from '@/lib/game/types';
import { mapPing, deriveCompletionEvents } from '@/lib/game/map-ping';
import { playSound } from '@/lib/game/sound-engine';
import { hapticCompletion } from '@/lib/game/haptics';
import { getEntriesEnteringFinalHour, deriveMedalEarned, countProgramCompletions } from '@/lib/game/juice-events';
import { getMissionCalendarEntries } from '@/lib/game/world-calendar';

interface GlobalEffectsLayerProps {
  state: GameState | null;
}

export default function GlobalEffectsLayer({ state }: GlobalEffectsLayerProps) {
  const prevStateRef = useRef<GameState | null>(null);
  // Calendar entries already dinged this session — prevents re-firing the
  // final-hour tick every time `state` updates while an entry sits inside
  // the window (ticks/saves fire this effect far more often than the hour
  // actually changes).
  const dingedCalendarRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;

    // ── Order completions: buildings finished, ships arrived, expeditions
    //    reached/returned from their destination. One beacon per event, one
    //    shared sound + haptic buzz for the batch (a tick can complete
    //    several buildings at once — we don't want a sound storm). ─────────
    const completions = deriveCompletionEvents(prev, state);
    if (completions.length > 0) {
      for (const ev of completions) mapPing(ev.target, 'complete', ev.label);
      playSound('build_complete');
      hapticCompletion();
    }

    // ── Corporate era medal change — engraved-plaque sting, not a money
    //    sound (see sound-engine.ts medal_sting comment). Skipped on first
    //    mount (prev === null) so loading a save with completed eras doesn't
    //    fire the sting for history that already happened. ─────────────────
    if (prev && deriveMedalEarned(prev.corporateEras?.completedEras, state.corporateEras?.completedEras)) {
      playSound('medal_sting');
      hapticCompletion();
    }

    // ── Program (crew cohort / leader development / R&D residency) queue
    //    completions — one soft chime per completion, capped so a bulk
    //    catch-up tick can't turn into a chime storm. ───────────────────────
    const programCompletions = countProgramCompletions(prev?.programs?.queues, state.programs?.queues);
    for (let i = 0; i < Math.min(programCompletions, 3); i++) playSound('program_complete');

    // ── Mission calendar final-hour tick. Skipped on first mount (prev ===
    //    null) so loading a save with entries already inside the window
    //    doesn't ding immediately. ──────────────────────────────────────────
    if (prev) {
      const entries = getMissionCalendarEntries(state, { horizonDays: 2 });
      const entering = getEntriesEnteringFinalHour(entries, dingedCalendarRef.current, Date.now());
      if (entering.length > 0) {
        playSound('calendar_tick');
        for (const id of entering) dingedCalendarRef.current.add(id);
      }
    }

    prevStateRef.current = state;
  }, [state]);

  return null;
}
