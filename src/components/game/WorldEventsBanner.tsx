'use client';

// ─── Sol Events — real-world feed banner ──────────────────────────────────
// Compact HUD strip that mirrors the site's real space-weather, launch, and
// program-milestone data into the game as in-universe "Sol Events" archive
// entries. Every player sees the same feed (public, unauthenticated
// /api/space-tycoon/world-feed route) — see src/lib/game/real-world-feed.ts
// for how each event is derived from data the site already collects.
//
// Also the client-side producer for the modest, time-bounded world-shared
// game effects (contract payout / research speed bonuses) described in
// CLAUDE.md: it queues a WorldEventBonusSnapshot into the existing
// server-effects.ts hand-off queue (the same mechanism the authenticated
// alliance-bonus sync pipeline uses to reach game-engine's tick), so the
// bonus applies even to solo/logged-out play. Solar-storm intentionally
// carries no live multiplier — hazards.ts's occurrence roll is a pure,
// deterministic function of (game-month, location, hazard type) with no
// external-multiplier hook, and bolting one on would compromise that
// system's reproducibility/test guarantees. It's display-only flavor here.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WorldEvent, WorldEventType, WorldEventSeverity } from '@/lib/game/real-world-feed';
import { deriveWorldEventBonuses } from '@/lib/game/real-world-feed';
import { deriveAppointmentEventBonuses } from '@/lib/game/appointment-events';
import { queueServerEffects } from '@/lib/game/server-effects';
import { usePrefersReducedMotion } from '@/hooks/useWorldState';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

const POLL_MS = 5 * 60 * 1000; // 5 minutes — matches the route's cache TTL

const TYPE_ICON: Record<WorldEventType, IconName> = {
  'solar-storm': 'hazard-solar-storm',
  'launch-window': 'fleet',
  milestone: 'megastructures',
};

const TYPE_LABEL: Record<WorldEventType, string> = {
  'solar-storm': 'Space Weather',
  'launch-window': 'Live Launch',
  milestone: 'Program Milestone',
};

const SEVERITY_FRAME: Record<WorldEventSeverity, string> = {
  notice: 'hud-frame border border-cyan-500/20 bg-cyan-500/[0.03]',
  elevated: 'hud-frame hud-frame-amber border border-amber-500/25 bg-amber-500/[0.04]',
  severe: 'hud-frame hud-frame-red border border-red-500/25 bg-red-500/[0.05]',
};

interface WorldFeedResponse {
  events?: WorldEvent[];
}

export default function WorldEventsBanner() {
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/space-tycoon/world-feed');
        if (!res.ok) return;
        const json = (await res.json()) as WorldFeedResponse;
        const active = Array.isArray(json.events) ? json.events : [];
        if (cancelled) return;
        setEvents(active);

        // Hand off the modest world-shared bonus to the tick engine. Always
        // queued (even when null) so an event that just expired correctly
        // clears any stale bonus rather than leaving it stuck.
        //
        // LS3 (docs/LIVE_SERVICE_2026-08.md §LS3): fixed-UTC appointment
        // world events (Belt Rush Weekend etc., src/lib/game/
        // appointment-events.ts) contribute through this SAME already-wired,
        // already-capped pipe (see appointment-events.ts header for why) —
        // merged additively with the Sol Events bonus before the engine's
        // clampWorldEventBonuses applies the final safety cap.
        const solBonus = deriveWorldEventBonuses(active);
        const apptBonus = deriveAppointmentEventBonuses(Date.now());
        const merged = solBonus || apptBonus
          ? {
              contractPayoutBonus: (solBonus?.contractPayoutBonus || 0) + (apptBonus?.contractPayoutBonus || 0),
              researchSpeedBonus: (solBonus?.researchSpeedBonus || 0) + (apptBonus?.researchSpeedBonus || 0),
              expiresAtMs: Math.max(solBonus?.expiresAtMs || 0, apptBonus?.expiresAtMs || 0),
            }
          : null;
        queueServerEffects({
          worldEventBonuses: merged,
          fetchedAtMs: Date.now(),
        });
      } catch {
        // Flavor feed — a failed poll just leaves the last-known banner up
        // (or empty on first load). Never surface an error to the player.
      }
    }

    void poll();
    const interval = setInterval(() => { void poll(); }, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (events.length === 0) return null;

  return (
    <div
      className="space-y-1.5"
      role="status"
      aria-live="polite"
      aria-label="Real-world space events reflected in this game session"
    >
      {events.map((evt) => (
        <Link
          key={evt.id}
          href={evt.href}
          className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] transition-colors hover:bg-white/[0.03] ${SEVERITY_FRAME[evt.severity]} ${reducedMotion ? '' : 'game-card'}`}
        >
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <span className="shrink-0"><GameIcon name={TYPE_ICON[evt.type]} size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="game-label mr-2">{TYPE_LABEL[evt.type]}</span>
            <span className="text-slate-200">{evt.headline}</span>
            <span className="block text-slate-500 text-[10px] italic mt-0.5">{evt.sourceLabel}</span>
          </span>
          <span className="text-cyan-400 text-[10px] shrink-0 font-hud uppercase tracking-wide" aria-hidden="true">View →</span>
        </Link>
      ))}
    </div>
  );
}
