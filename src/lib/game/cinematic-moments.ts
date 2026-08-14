// ─── Space Tycoon: Cinematic Presentation Queue (4X Upgrade Wave W5) ────────
// docs/4X_BASELINE_2026-08.md Part 3.4 "Cinematic event presentation" +
// Part 4 wave table row W5: generalize MilestoneVignette.tsx into a full-
// screen CinematicOverlay used for emotional-peak moments — narrative
// chain-head arrivals, science-mission discoveries, expedition arrivals /
// first contact, victory achievements, megastructure completions.
//
// This module is 100% pure and framework-free on purpose: it takes state
// data (GameEvent entries, a PendingChainChoiceUI, a milestone claim result)
// and returns CinematicMoment values / queue arrays — no React, no
// timers, no DOM, no side effects. The presentation queue is explicitly
// CLIENT-SIDE ONLY per the wave brief ("keep presentation client-side") —
// nothing here touches GameState or save-load.ts. src/app/space-tycoon/
// page.tsx owns the useState<CinematicMoment[]> queue, the useEffect
// watchers that call detectCinematicMomentsFromEvents /
// buildNarrativeChoiceCinematicMoment / buildDiscoveryCinematicMoment, and
// renders <CinematicOverlay> off the head of the queue — the same
// eventLog/report-diff watcher pattern the wave-8 Frontier-graduation modal
// effect uses (capture a baseline on mount, only react to entries that
// arrive afterward).

import type { GameEvent } from './types';
import type { PendingChainChoiceUI } from './narrative-events';
import { isCinematicChainStage, CINEMATIC_INFO_STAGE_TITLES } from './narrative-events';
import { PLANET_ASSETS, BG_ASSETS, EVENT_ART } from './assets';

export type CinematicMomentKind = 'narrative' | 'discovery' | 'expedition' | 'victory' | 'megastructure';

export interface CinematicMoment {
  /** Stable dedupe key — see each builder for its scheme. */
  id: string;
  kind: CinematicMomentKind;
  title: string;
  subtitle?: string;
  icon: string;
  /** Hex accent used for glow/ring/title color. */
  accent: string;
  /** Backdrop art path. Narrative moments prefer a dedicated 16:9 event
   *  illustration (EVENT_ART, generated in 4X Wave W2 — 12 of the 44 event
   *  chain-heads have one so far) and fall back to thematic PLANET_ASSETS/
   *  BG_ASSETS biome art for the rest (see pickNarrativeArt below).
   *  Undefined falls back to a plain radial-glow backdrop, same as
   *  MilestoneVignette. */
  art?: string;
}

/** Cap on queued-but-unshown moments — a burst (e.g. catch-up processing
 *  many game-months in one tick) should not queue an unbounded backlog of
 *  full-screen interruptions. Oldest-dropped-silently beyond this is an
 *  acceptable trade: the underlying eventLog/report entries are untouched,
 *  only the cinematic *presentation* of the overflow is skipped. */
export const MAX_CINEMATIC_QUEUE = 6;

// ─── Pure queue operations ──────────────────────────────────────────────────

/** Append newly-detected moments to the queue, de-duplicated against what's
 *  already queued (by id) and capped at MAX_CINEMATIC_QUEUE. Pure — same
 *  inputs always produce the same output array (a new array, or the exact
 *  same reference back when there is nothing to add, so callers can skip a
 *  re-render via setState's built-in reference check). */
export function enqueueCinematicMoments(queue: CinematicMoment[], incoming: CinematicMoment[]): CinematicMoment[] {
  if (incoming.length === 0) return queue;
  const existingIds = new Set(queue.map(m => m.id));
  const deduped: CinematicMoment[] = [];
  for (const m of incoming) {
    if (existingIds.has(m.id)) continue;
    existingIds.add(m.id); // guards duplicate ids within the same incoming batch too
    deduped.push(m);
  }
  if (deduped.length === 0) return queue;
  return [...queue, ...deduped].slice(0, MAX_CINEMATIC_QUEUE);
}

/** Drop the head of the queue (the moment currently being shown / just
 *  dismissed). Pure — returns a new array. */
export function dequeueCinematicMoment(queue: CinematicMoment[]): CinematicMoment[] {
  return queue.slice(1);
}

// ─── Art selection — dedicated art first, thematic biome art as fallback ───

/** Thematic backdrop per narrative chain, drawn from the existing
 *  PLANET_ASSETS/BG_ASSETS biome library (src/lib/game/assets.ts). Used only
 *  when EVENT_ART has no dedicated illustration for the chain (see
 *  pickNarrativeArt) — kept as the permanent fallback so a future chain
 *  added without art still renders something on-theme instead of nothing. */
const NARRATIVE_CHAIN_ART: Record<string, string> = {
  space_weather_ladder: BG_ASSETS.spaceNebula, // unused today (chain deliberately not cinematic-flagged) — kept for completeness
  europa_biosignature: PLANET_ASSETS.ice,
  contamination_protocols: PLANET_ASSETS.anomaly,
  iso_flyby: PLANET_ASSETS.anomaly,
  accord_council: BG_ASSETS.starfield,
  superconductor_crisis: PLANET_ASSETS.anomaly,
  industry_shocks: PLANET_ASSETS.terrestrial,
  crew_health_crisis: PLANET_ASSETS.terrestrial,
  great_silence_recurrence: PLANET_ASSETS.ancient_ruins,
  triton_archive_followup: PLANET_ASSETS.ancient_ruins,
  wanderer1_anomaly: PLANET_ASSETS.ancient_ruins,
  ring_fire_anniversary: PLANET_ASSETS.gas_giant,
};

function pickNarrativeArt(chainId: string): string | undefined {
  return EVENT_ART[chainId] ?? NARRATIVE_CHAIN_ART[chainId];
}

// ─── Detection: eventLog diffs → cinematic moments ──────────────────────────
// Consumed by the page's eventLog-diff watcher effect (same "capture a
// baseline on mount, react only to what arrives after" shape as the
// wave-8 Frontier-graduation effect). Callers pass ONLY the newly-arrived
// GameEvent entries (already filtered against a seen-ids set) — this
// function itself does no baselining, it just classifies.

const VICTORY_TITLE_PREFIX = '🥇 Victory: ';
const EXPEDITION_ARRIVAL_PREFIX = '🌌 Arrival: ';
const MEGASTRUCTURE_COMPLETE_SUFFIX = ' Complete!';

export function detectCinematicMomentsFromEvents(events: GameEvent[]): CinematicMoment[] {
  const moments: CinematicMoment[] = [];

  for (const ev of events) {
    // Narrative chain-head 'info' stages resolve automatically and log under
    // the exact `${stage.icon} ${stage.name}` title advanceNarrativeChains
    // uses — CINEMATIC_INFO_STAGE_TITLES is keyed the same way.
    const chainHit = CINEMATIC_INFO_STAGE_TITLES.get(ev.title);
    if (chainHit) {
      moments.push({
        id: `narrative:${ev.id}`,
        kind: 'narrative',
        title: chainHit.chainName,
        subtitle: chainHit.name,
        icon: chainHit.icon,
        accent: '#22d3ee',
        art: pickNarrativeArt(chainHit.chainId),
      });
      continue;
    }

    if (ev.type !== 'milestone') continue;

    if (ev.title.startsWith(VICTORY_TITLE_PREFIX)) {
      moments.push({
        id: `victory:${ev.id}`,
        kind: 'victory',
        title: 'VICTORY ACHIEVED',
        subtitle: ev.title.slice(VICTORY_TITLE_PREFIX.length),
        icon: '🥇',
        accent: '#fbbf24',
        art: PLANET_ASSETS.colony,
      });
      continue;
    }

    if (ev.title.endsWith(MEGASTRUCTURE_COMPLETE_SUFFIX)) {
      const icon = ev.title.split(' ')[0] || '🏗️';
      moments.push({
        id: `megastructure:${ev.id}`,
        kind: 'megastructure',
        title: 'MEGASTRUCTURE COMPLETE',
        subtitle: ev.title.slice(0, -MEGASTRUCTURE_COMPLETE_SUFFIX.length),
        icon,
        accent: '#a78bfa',
        art: BG_ASSETS.spaceNebula,
      });
      continue;
    }

    if (ev.title.startsWith(EXPEDITION_ARRIVAL_PREFIX)) {
      const firstContact = ev.description.includes('First contact');
      moments.push({
        id: `expedition:${ev.id}`,
        kind: 'expedition',
        title: firstContact ? 'FIRST CONTACT' : 'EXPEDITION ARRIVAL',
        subtitle: ev.title.slice(EXPEDITION_ARRIVAL_PREFIX.length),
        icon: firstContact ? '👽' : '🌌',
        accent: firstContact ? '#a78bfa' : '#22d3ee',
        art: firstContact ? PLANET_ASSETS.anomaly : PLANET_ASSETS.nebula,
      });
    }
  }

  return moments;
}

// ─── Detection: pendingChoice → narrative chain-head 'choice' stages ───────
// 'choice'-kind chain-head stages never reach eventLog until the player has
// already resolved them (they live in state.pendingChoice while awaiting
// input), so they need their own trigger — the page's pendingChoice-diff
// watcher calls this on every newly-arrived pendingChoice.

export function buildNarrativeChoiceCinematicMoment(pending: PendingChainChoiceUI | null | undefined): CinematicMoment | null {
  if (!pending || !pending.chainId || pending.stageIndex === undefined) return null;
  if (!isCinematicChainStage(pending.chainId, pending.stageIndex)) return null;
  return {
    id: `narrative:${pending.eventId}`,
    kind: 'narrative',
    title: pending.chainName || pending.eventName,
    subtitle: pending.eventName,
    icon: pending.eventIcon,
    accent: '#22d3ee',
    art: pickNarrativeArt(pending.chainId),
  };
}

// ─── Detection: science-mission global first-claim success ────────────────
// The page's existing milestone-claim effect (src/app/space-tycoon/page.tsx,
// the postWithRetry('/api/space-tycoon/milestones', ...) handler from Wave
// W6) already knows the outcome — this is a plain builder, called only on
// `data.success === true` ("first ocean entry, biosignature confirmation"
// per the wave brief).

export function buildDiscoveryCinematicMoment(milestoneId: string, programName: string): CinematicMoment {
  const label = milestoneId.replace(/_/g, ' ');
  const art = /ocean|plume|aquifer/.test(milestoneId) ? PLANET_ASSETS.ice : PLANET_ASSETS.nebula;
  return {
    id: `discovery:${milestoneId}`,
    kind: 'discovery',
    title: 'FIRST IN THE WORLD',
    subtitle: `${label} — ${programName}`,
    icon: '🔬',
    accent: '#34d399',
    art,
  };
}
