// ─── Signal Iconography System (Wave V1, docs/VISUAL_DEPTH_2026-08.md §V1) ──
// A hand-authored, stroke-based icon registry replacing the 184+ ad-hoc
// emoji standing in for UI signal across Space Tycoon. Every glyph shares a
// 24x24 grid, currentColor stroke, and 1.5px weight (matching the hud-frame
// bracket weight in GameStyles.tsx) so icons inherit theming and glow like
// any other HUD element.
//
// This is a REGISTRY, not a mounted DOM sprite — deliberately. A classic
// <symbol>-sheet approach means injecting all ~110 defs into the DOM on
// every page load whether or not they're used. Here each <GameIcon> renders
// only the tiny inline <svg> for the icon it actually needs (see
// GameIcon.tsx), so unused glyphs cost nothing beyond a few bytes of JS in
// this module — the tree-shakeable, no-network-fetch goal from the spec,
// just achieved via a per-instance render instead of a pre-mounted sprite.
//
// Icons are shape-first (spec: "colorblind safety... shape is reinforcement,
// color is never the only signal" — the SolarMap3D ♛/◆ precedent). Where a
// concept has no obvious pictogram (era medals, faction crests) a distinct
// SHAPE is used per variant, never color alone — see the medal/faction
// groups below.
//
// Consumers should treat `IconName` as the source of truth: `resolveIcon()`
// below is the bridge for the many data files (seasonal-events.ts,
// alliance-events.ts, corporate-eras.ts, etc.) that still author a literal
// emoji string per entry — those data files are out of this wave's sweep
// scope (src/components/game/ only), so call sites that render a
// data-sourced emoji should route it through `resolveIcon(glyph, fallback)`
// rather than rendering the emoji directly. Unmapped glyphs fall back
// gracefully to the raw emoji (never a blank icon).

export type IconName =
  // ── Tabs (31 — TAB_CATALOG, page.tsx) ──────────────────────────────────
  | 'dashboard' | 'build' | 'research' | 'map' | 'services' | 'fleet'
  | 'reports' | 'contracts' | 'crafting' | 'market' | 'workforce' | 'alliance'
  | 'bounties' | 'predictions' | 'megaproject' | 'megastructures' | 'espionage'
  | 'territory' | 'speedruns' | 'seasons' | 'leaderboard' | 'commanders'
  | 'factions' | 'modules' | 'discoveries' | 'science' | 'interstellar'
  | 'subsidiaries' | 'specialization' | 'victory' | 'governance'
  // ── Resource categories (resources.ts ResourceDefinition.category) ─────
  | 'resource-water' | 'resource-metal' | 'resource-precious'
  | 'resource-rare-earth' | 'resource-hydrocarbon' | 'resource-exotic'
  | 'resource-generic'
  // ── Ship roles (ships.ts ShipRole) ──────────────────────────────────────
  | 'ship-transport' | 'ship-mining' | 'ship-survey' | 'ship-tanker'
  // ── Building categories (buildings.ts) ──────────────────────────────────
  | 'bld-launch-pad' | 'bld-ground-station' | 'bld-satellite'
  | 'bld-space-station' | 'bld-datacenter' | 'bld-solar-farm' | 'bld-mining'
  | 'bld-fabrication'
  // ── Mission calendar categories (world-calendar.ts CalendarCategory) ───
  | 'cal-senate' | 'cal-league' | 'cal-season' | 'cal-alliance-event'
  | 'cal-npc-program' | 'cal-expedition' | 'cal-queue'
  | 'cal-appointment-event' | 'cal-real-launch' | 'cal-alliance-charter'
  | 'cal-corporate-era' | 'cal-economic-cycle' | 'cal-program'
  | 'cal-leader-retirement' | 'cal-realignment' | 'cal-story-chapter'
  // ── Hazards (types.ts recentHazards.type + generic severity fallback) ──
  | 'hazard-solar-storm' | 'hazard-micrometeorite' | 'hazard-pirate-raid'
  | 'hazard-equipment-failure' | 'hazard-generic'
  // ── Era medal tiers (corp-era-registry.ts) — shape-distinct, never
  //    color-only; "filed"/unearned uses the outline variant. ────────────
  | 'medal' | 'medal-outline'
  // ── Factions (factions.ts FACTIONS) ─────────────────────────────────────
  | 'faction-dominion' | 'faction-syndicate' | 'faction-corsairs'
  | 'faction-hive' | 'faction-reavers' | 'faction-remnants'
  // ── Program tracks (programs.ts ProgramTrack) ───────────────────────────
  | 'track-crew-cohort' | 'track-leader-development' | 'track-rd-residency'
  // ── Misc HUD ─────────────────────────────────────────────────────────────
  | 'save' | 'mute' | 'unmute' | 'music' | 'ambient' | 'haptics' | 'haptics-off' | 'restart' | 'quit'
  | 'density-comfortable' | 'density-compact'
  | 'help' | 'more' | 'close' | 'chevron-up' | 'chevron-down' | 'check'
  | 'warning' | 'info' | 'activity' | 'money' | 'trending-up'
  | 'trending-down' | 'handshake' | 'package' | 'target' | 'swords'
  | 'scroll' | 'sparkle' | 'external-link' | 'arrow-up' | 'arrow-down'
  | 'calendar' | 'clock' | 'shield' | 'city' | 'comet' | 'cargo-truck'
  | 'lock' | 'idea' | 'balance' | 'alien' | 'archive' | 'globe' | 'wrench' | 'idle'
  | 'edit' | 'power' | 'npc';

type El =
  | { e: 'path'; d: string; fill?: 'currentColor' | 'none' }
  | { e: 'circle'; cx: number; cy: number; r: number; fill?: 'currentColor' | 'none' }
  | { e: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: 'currentColor' | 'none' }
  | { e: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { e: 'polyline'; points: string }
  | { e: 'polygon'; points: string; fill?: 'currentColor' | 'none' };

export interface IconDef {
  /** Human meaning — surfaced to future authors, and used as the default
   *  accessible label when a consumer passes `label` without its own text. */
  meaning: string;
  els: El[];
}

const p = (d: string, fill?: 'currentColor' | 'none'): El => ({ e: 'path', d, fill });
const c = (cx: number, cy: number, r: number, fill?: 'currentColor' | 'none'): El => ({ e: 'circle', cx, cy, r, fill });
const r = (x: number, y: number, w: number, h: number, rx?: number): El => ({ e: 'rect', x, y, w, h, rx });
const l = (x1: number, y1: number, x2: number, y2: number): El => ({ e: 'line', x1, y1, x2, y2 });
const pl = (points: string): El => ({ e: 'polyline', points });
const pg = (points: string, fill?: 'currentColor' | 'none'): El => ({ e: 'polygon', points, fill });

export const ICONS: Record<IconName, IconDef> = {
  // ── Tabs ──────────────────────────────────────────────────────────────
  dashboard: { meaning: 'Command dashboard — grid of live readouts', els: [r(4, 4, 7, 7, 1), r(13, 4, 7, 7, 1), r(4, 13, 7, 7, 1), r(13, 13, 7, 7, 1)] },
  build: { meaning: 'Construction — crane raising a girder', els: [l(6, 20, 6, 6), l(6, 6, 18, 6), l(18, 6, 18, 11), l(6, 11, 12, 11), l(12, 11, 12, 20), l(3, 20, 21, 20)] },
  research: { meaning: 'R&D tree — laboratory flask', els: [p('M10 3h4'), p('M11 3v6l-5.5 9.5A2 2 0 0 0 7.2 21h9.6a2 2 0 0 0 1.7-2.5L13 9V3')] },
  map: { meaning: 'Solar map — folded chart with a location pin', els: [pl('3,6 9,4 15,6 21,4 21,18 15,20 9,18 3,20 3,6'), l(9, 4, 9, 18), l(15, 6, 15, 20), c(12, 11, 1.4, 'currentColor')] },
  services: { meaning: 'Orbital services — broadcast dish', els: [p('M4 12a8 8 0 0 1 8-8'), p('M4 12a8 8 0 0 0 8 8'), c(12, 12, 2.4, 'currentColor'), l(12, 4, 12, 2), l(12, 20, 12, 22)] },
  fleet: { meaning: 'Fleet — rocket silhouette', els: [p('M12 2c3 2 4 6 4 10 0 2-1 4-4 6-3-2-4-4-4-6 0-4 1-8 4-10z'), p('M8 15l-3 5', 'none'), p('M16 15l3 5', 'none'), c(12, 10, 1.6, 'currentColor')] },
  reports: { meaning: 'Reports inbox — tray with a document', els: [pl('3,13 8,13 10,16 14,16 16,13 21,13'), pl('3,13 5,5 19,5 21,13'), r(3, 13, 18, 6, 1)] },
  contracts: { meaning: 'Contracts — clipboard with checklines', els: [r(5, 4, 14, 17, 2), r(9, 2, 6, 4, 1), l(8, 10, 16, 10), l(8, 13, 16, 13), l(8, 16, 13, 16)] },
  crafting: { meaning: 'Crafting — hammer', els: [p('M14.5 6.5l3 3-8 8-3-3z'), p('M13 8l4-4 3 3-4 4'), p('M6 15l3 3-2.5 2.5a1.8 1.8 0 0 1-2.5 -2.5z')] },
  market: { meaning: 'Markets — rising line chart', els: [pl('4,17 9,11 13,14 20,5'), pl('15,5 20,5 20,10'), l(4, 20, 20, 20)] },
  workforce: { meaning: 'Crew — hard-hat operator', els: [c(12, 7, 3, 'none'), p('M8 7a4 4 0 0 1 8 0'), p('M5 21v-3a7 7 0 0 1 14 0v3')] },
  alliance: { meaning: 'Corporation — office tower', els: [r(6, 3, 12, 18, 1), l(9, 7, 9, 7), l(12, 7, 12, 7), l(15, 7, 15, 7), l(9, 11, 9, 11), l(12, 11, 12, 11), l(15, 11, 15, 11), l(9, 15, 9, 15), l(12, 15, 12, 15), l(15, 15, 15, 15), r(10, 17, 4, 4)] },
  bounties: { meaning: 'Bounties — target crosshair', els: [c(12, 12, 8, 'none'), c(12, 12, 4, 'none'), c(12, 12, 0.8, 'currentColor'), l(12, 2, 12, 5), l(12, 19, 12, 22), l(2, 12, 5, 12), l(19, 12, 22, 12)] },
  predictions: { meaning: 'Predictions — crystal ball on a stand', els: [c(12, 10, 6, 'none'), l(8, 20, 16, 20), l(12, 16, 12, 20), p('M8 9c1-1 2.5-1.5 4-1.5')] },
  megaproject: { meaning: 'Mega-project — a planet with construction rings', els: [c(12, 12, 7, 'none'), p('M4 9c3 2 13 2 16 0'), p('M4 15c3-2 13-2 16 0')] },
  megastructures: { meaning: 'Megastructures — orbital ring around a body', els: [c(12, 12, 3, 'none'), p('M2 12c0-3 4.5-5 10-5s10 2 10 5-4.5 5-10 5-10-2-10-5z')] },
  espionage: { meaning: 'Intel — eye behind a mask edge', els: [p('M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z'), c(12, 12, 3, 'none')] },
  territory: { meaning: 'Territory — flag on a pin', els: [l(6, 3, 6, 21), p('M6 4h13l-3 4 3 4H6')] },
  speedruns: { meaning: 'Speed run — stopwatch', els: [c(12, 13, 8, 'none'), l(12, 13, 12, 8), l(9, 2, 15, 2), l(19, 5, 20.5, 6.5)] },
  seasons: { meaning: 'Seasons — four-point star burst', els: [p('M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z')] },
  leaderboard: { meaning: 'Standings — trophy cup', els: [p('M7 4h10v5a5 5 0 0 1-10 0z'), p('M7 5H4a3 3 0 0 0 3 5'), p('M17 5h3a3 3 0 0 1-3 5'), l(12, 14, 12, 18), l(8, 21, 16, 21), l(9, 18, 15, 18)] },
  commanders: { meaning: 'Commanders — five-point star medal', els: [p('M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.5L12 15l-5 2.9 1.2-5.5-4.2-3.8 5.6-.6z')] },
  factions: { meaning: 'Factions — shield', els: [p('M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z')] },
  modules: { meaning: 'Modules — gear/cog', els: [c(12, 12, 3, 'none'), p('M12 3v3M12 18v3M4.2 7.8l2.6 1.5M17.2 14.7l2.6 1.5M4.2 16.2l2.6-1.5M17.2 9.3l2.6-1.5M3 12h3M18 12h3')] },
  discoveries: { meaning: 'Discoveries — telescope', els: [p('M4 14l14-6 1.5 3.5-14 6z'), l(9.5, 10, 14, 20), l(4, 14, 6, 19), c(6, 8, 1.6, 'none')] },
  science: { meaning: 'Science missions — test tube', els: [p('M9 2h6'), p('M10 2v7l-4.5 8.5A2 2 0 0 0 7.3 20.5h9.4a2 2 0 0 0 1.8-2.9L14 9V2'), l(8, 15, 16, 15)] },
  interstellar: { meaning: 'Interstellar — comet streaking past a star', els: [p('M18 6l1.2 2.6L22 10l-2.8 1.4L18 14l-1.2-2.6L14 10l2.8-1.4z'), p('M3 21l7-7'), p('M3 21l3-1 1-3')] },
  subsidiaries: { meaning: 'Subsidiaries — factory with stacks', els: [p('M3 21V11l5 3v-3l5 3v-3l5 3v7z'), l(6, 8, 6, 5), l(11, 8, 11, 5), l(3, 21, 21, 21)] },
  specialization: { meaning: 'Specialization — bullseye target', els: [c(12, 12, 8, 'none'), c(12, 12, 4.5, 'none'), c(12, 12, 1, 'currentColor')] },
  victory: { meaning: 'Victory — laurel-wrapped medal', els: [c(12, 10, 5, 'none'), p('M5 14c-1 2-2 3-2 5l4-1'), p('M19 14c1 2 2 3 2 5l-4-1'), l(10, 15, 9, 21), l(14, 15, 15, 21), l(9, 21, 15, 21)] },
  governance: { meaning: 'Governance — senate column facade', els: [l(4, 21, 20, 21), l(4, 8, 20, 8), pg('3,8 12,3 21,8'), l(6, 8, 6, 18), l(10, 8, 10, 18), l(14, 8, 14, 18), l(18, 8, 18, 18)] },

  // ── Resource categories ───────────────────────────────────────────────
  'resource-water': { meaning: 'Water/ice resources', els: [p('M12 3c3 4.5 6 8 6 11.5A6 6 0 0 1 6 14.5C6 11 9 7.5 12 3z')] },
  'resource-metal': { meaning: 'Metal ore resources', els: [pg('12,3 20,8 20,16 12,21 4,16 4,8'), l(4, 8, 12, 12), l(12, 12, 20, 8), l(12, 12, 12, 21)] },
  'resource-precious': { meaning: 'Precious-metal resources', els: [pg('5,9 12,3 19,9 12,21'), l(5, 9, 19, 9), l(9, 9, 12, 21), l(15, 9, 12, 21)] },
  'resource-rare-earth': { meaning: 'Rare-earth element resources', els: [c(12, 12, 2, 'currentColor'), p('M12 12m-8 0a8 4 0 1 0 16 0a8 4 0 1 0 -16 0'), p('M12 12m-4 8a8 4 90 1 0 16 0a8 4 90 1 0 -16 0')] },
  'resource-hydrocarbon': { meaning: 'Hydrocarbon/fuel resources', els: [r(8, 8, 8, 13, 1), l(8, 11, 16, 11), p('M10 8V5h4v3')] },
  'resource-exotic': { meaning: 'Exotic-matter resources', els: [p('M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z'), c(18, 18, 1.6, 'currentColor')] },
  'resource-generic': { meaning: 'Generic resource/commodity', els: [r(5, 9, 14, 10, 1), l(5, 13, 19, 13), p('M9 9V6a3 3 0 0 1 6 0v3')] },

  // ── Ship roles ────────────────────────────────────────────────────────
  'ship-transport': { meaning: 'Transport ship role', els: [p('M3 16l2-6h10l3 6z'), r(4, 16, 16, 3, 1), c(8, 19.5, 1.3, 'none'), c(16, 19.5, 1.3, 'none')] },
  'ship-mining': { meaning: 'Mining ship role — pickaxe', els: [p('M5 5c4-1.5 8-1.5 12 2s3.5 8 2 12'), p('M9 15l-6 6')] },
  'ship-survey': { meaning: 'Survey ship role — radar sweep', els: [c(12, 12, 8, 'none'), c(12, 12, 1.4, 'currentColor'), p('M12 12L18 7')] },
  'ship-tanker': { meaning: 'Fuel tanker ship role', els: [r(7, 6, 10, 14, 4), l(9, 3, 9, 6), l(15, 3, 15, 6)] },

  // ── Building categories ──────────────────────────────────────────────
  'bld-launch-pad': { meaning: 'Launch pad building category', els: [p('M12 3l2.5 8h-5z'), l(12, 11, 12, 16), pg('7,21 12,16 17,21')] },
  'bld-ground-station': { meaning: 'Ground station building category', els: [p('M4 12a8 8 0 0 1 8-8'), l(12, 4, 12, 12), l(4, 12, 12, 12), l(2, 20, 22, 20), r(9, 15, 6, 5)] },
  'bld-satellite': { meaning: 'Satellite building category', els: [r(9.5, 9.5, 5, 5, 1), l(3, 3, 6.5, 6.5), l(21, 3, 17.5, 6.5), l(3, 21, 6.5, 17.5), l(21, 21, 17.5, 17.5), l(2, 2, 4, 4), l(22, 2, 20, 4)] },
  'bld-space-station': { meaning: 'Space station building category', els: [c(12, 12, 4, 'none'), p('M2 12a10 4 0 1 0 20 0a10 4 0 1 0 -20 0'), l(12, 8, 12, 4), l(12, 16, 12, 20)] },
  'bld-datacenter': { meaning: 'Data center building category', els: [r(5, 4, 14, 5, 1), r(5, 10, 14, 5, 1), r(5, 16, 14, 5, 1), c(8, 6.5, 0.6, 'currentColor'), c(8, 12.5, 0.6, 'currentColor'), c(8, 18.5, 0.6, 'currentColor')] },
  'bld-solar-farm': { meaning: 'Solar farm building category', els: [c(6, 6, 2.2, 'none'), l(6, 1.5, 6, 3), l(6, 9, 6, 10.5), l(1.5, 6, 3, 6), l(9, 6, 10.5, 6), r(9, 13, 12, 8, 1), l(9, 17, 21, 17), l(13, 13, 13, 21), l(17, 13, 17, 21)] },
  'bld-mining': { meaning: 'Mining enterprise building category', els: [p('M4 20l6-10 3 3 4-7 3 14z'), l(2, 20, 22, 20)] },
  'bld-fabrication': { meaning: 'Fabrication facility building category', els: [p('M3 21V11l5 3v-3l5 3v-3l5 3v7z'), l(3, 21, 21, 21), c(9, 6, 2, 'none'), p('M9 3v1M9 8v1M6.5 6h1M10.5 6h1')] },

  // ── Mission calendar categories ──────────────────────────────────────
  'cal-senate': { meaning: 'Accord Senate calendar entries', els: [l(4, 21, 20, 21), l(4, 8, 20, 8), pg('3,8 12,3 21,8'), l(6, 8, 6, 18), l(10, 8, 10, 18), l(14, 8, 14, 18), l(18, 8, 18, 18)] },
  'cal-league': { meaning: 'League week calendar entries', els: [p('M7 4h10v5a5 5 0 0 1-10 0z'), l(12, 14, 12, 18), l(8, 21, 16, 21)] },
  'cal-season': { meaning: 'Season transition calendar entries', els: [p('M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z')] },
  'cal-alliance-event': { meaning: 'Alliance event window calendar entries', els: [p('M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'), p('M16 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'), p('M4 20c0-3 2-5 4-5s4 2 4 5'), p('M12 20c0-3 2-5 4-5s4 2 4 5')] },
  'cal-npc-program': { meaning: 'NPC co-fund program calendar entries', els: [r(4, 8, 16, 11, 1), l(4, 12, 20, 12), c(8, 15, 0.6, 'currentColor'), c(12, 15, 0.6, 'currentColor'), l(4, 8, 8, 4), l(20, 8, 16, 4)] },
  'cal-expedition': { meaning: 'Expedition milestone calendar entries', els: [p('M12 2c3 2 4 6 4 10 0 2-1 4-4 6-3-2-4-4-4-6 0-4 1-8 4-10z'), p('M8 15l-3 5', 'none'), p('M16 15l3 5', 'none')] },
  'cal-queue': { meaning: 'Command queue completion calendar entries', els: [c(12, 12, 8, 'none'), l(12, 12, 12, 7), l(12, 12, 15.5, 14)] },
  'cal-appointment-event': { meaning: 'World appointment event calendar entries', els: [r(4, 5, 16, 16, 2), l(4, 10, 20, 10), l(8, 3, 8, 7), l(16, 3, 16, 7), l(12, 14, 12, 18), l(10, 16, 14, 16)] },
  'cal-real-launch': { meaning: 'Real-world launch window calendar entries', els: [p('M12 2c3 2 4 6 4 10 0 2-1 4-4 6-3-2-4-4-4-6 0-4 1-8 4-10z'), c(12, 10, 1.6, 'currentColor')] },
  'cal-alliance-charter': { meaning: 'Alliance season charter calendar entries', els: [r(6, 3, 12, 17, 1), l(9, 8, 15, 8), l(9, 12, 15, 12), l(9, 16, 13, 16), l(6, 20, 18, 20)] },
  'cal-corporate-era': { meaning: 'Corporate era-end calendar entries', els: [l(4, 21, 20, 21), l(4, 8, 20, 8), pg('3,8 12,3 21,8'), l(6, 8, 6, 18), l(10, 8, 10, 18), l(14, 8, 14, 18), l(18, 8, 18, 18)] },
  'cal-economic-cycle': { meaning: 'Commodity super-cycle announcement calendar entries', els: [p('M4 12a8 8 0 0 1 14-5'), p('M20 12a8 8 0 0 1-14 5'), pl('18,3 18,7 14,7'), pl('6,21 6,17 10,17')] },
  'cal-program': { meaning: 'Training program completion calendar entries', els: [p('M12 4L2 9l10 5 10-5z'), p('M6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5')] },
  'cal-leader-retirement': { meaning: 'Leader retirement calendar entries', els: [p('M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.5L12 15l-5 2.9 1.2-5.5-4.2-3.8 5.6-.6z')] },
  'cal-realignment': { meaning: 'Realignment epoch calendar entries', els: [c(12, 12, 8, 'none'), l(12, 4, 12, 20), l(4, 12, 20, 12), p('M12 6a6 8 0 0 1 0 12', 'none')] },
  'cal-story-chapter': { meaning: 'Story chapter beat calendar entries', els: [p('M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0z'), p('M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0z')] },

  // ── Hazards ───────────────────────────────────────────────────────────
  'hazard-solar-storm': { meaning: 'Solar storm hazard', els: [c(12, 12, 3.5, 'none'), l(12, 3, 12, 5.5), l(12, 18.5, 12, 21), l(3, 12, 5.5, 12), l(18.5, 12, 21, 12), l(5.6, 5.6, 7.4, 7.4), l(16.6, 16.6, 18.4, 18.4), l(5.6, 18.4, 7.4, 16.6), l(16.6, 7.4, 18.4, 5.6)] },
  'hazard-micrometeorite': { meaning: 'Micrometeorite strike hazard', els: [p('M9 4l2 5 5 2-5 2-2 5-2-5-5-2 5-2z'), c(18, 17, 1.4, 'currentColor')] },
  'hazard-pirate-raid': { meaning: 'Pirate raid hazard', els: [l(5, 5, 19, 19), l(19, 5, 5, 19), pl('5,5 5,8 8,5'), pl('19,19 19,16 16,19'), pl('19,5 19,8 16,5'), pl('5,19 5,16 8,19')] },
  'hazard-equipment-failure': { meaning: 'Equipment failure hazard', els: [c(12, 12, 3, 'none'), p('M12 3v3M12 18v3M4.2 7.8l2.6 1.5M17.2 14.7l2.6 1.5M4.2 16.2l2.6-1.5M17.2 9.3l2.6-1.5M3 12h3M18 12h3'), l(12, 12, 12, 12)] },
  'hazard-generic': { meaning: 'Generic hazard/warning', els: [p('M12 3l10 18H2z'), l(12, 9, 12, 14), c(12, 17, 0.6, 'currentColor')] },

  // ── Era medals — shape-distinct (never color-only) ──────────────────
  medal: { meaning: 'Earned era medal (any tier — tier conveyed by adjacent text label, never by color alone)', els: [c(12, 10, 6, 'none'), c(12, 10, 2.4, 'currentColor'), l(9, 15, 7, 21), l(15, 15, 17, 21), l(7, 21, 12, 18), l(17, 21, 12, 18)] },
  'medal-outline': { meaning: 'Unearned/filed era medal', els: [c(12, 10, 6, 'none'), l(9, 15, 7, 21), l(15, 15, 17, 21), l(7, 21, 12, 18), l(17, 21, 12, 18)] },

  // ── Factions — each a distinct crest shape ──────────────────────────
  'faction-dominion': { meaning: 'The Dominion faction crest', els: [p('M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z'), l(12, 6, 12, 16), l(8, 11, 16, 11)] },
  'faction-syndicate': { meaning: 'The Syndicate faction crest', els: [p('M4 10c0-3 3.5-5 8-5s8 2 8 5v3c0 4-4 7-8 7s-8-3-8-7z'), c(9, 12, 1, 'currentColor'), c(15, 12, 1, 'currentColor'), l(10, 16, 14, 16)] },
  'faction-corsairs': { meaning: 'Void Corsairs faction crest', els: [l(5, 5, 19, 19), l(19, 5, 5, 19), c(12, 12, 2, 'none')] },
  'faction-hive': { meaning: 'Hive Collective faction crest', els: [c(12, 5, 1.6, 'currentColor'), c(5, 10, 1.6, 'currentColor'), c(19, 10, 1.6, 'currentColor'), c(8, 18, 1.6, 'currentColor'), c(16, 18, 1.6, 'currentColor'), l(12, 5, 5, 10), l(12, 5, 19, 10), l(5, 10, 8, 18), l(19, 10, 16, 18), l(8, 18, 16, 18)] },
  'faction-reavers': { meaning: 'Nebula Reavers faction crest', els: [p('M3 15c3-4 6 4 9 0s6-4 9 0'), p('M3 10c3-4 6 4 9 0s6-4 9 0')] },
  'faction-remnants': { meaning: 'Echo Remnants faction crest', els: [p('M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0z'), p('M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0z'), c(12, 12, 1.3, 'currentColor')] },

  // ── Program tracks ────────────────────────────────────────────────────
  'track-crew-cohort': { meaning: 'Crew cohort program track', els: [p('M12 4L2 9l10 5 10-5z'), p('M6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5')] },
  'track-leader-development': { meaning: 'Leadership development program track', els: [p('M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.5L12 15l-5 2.9 1.2-5.5-4.2-3.8 5.6-.6z')] },
  'track-rd-residency': { meaning: 'R&D residency program track', els: [p('M9 2h6'), p('M10 2v7l-4.5 8.5A2 2 0 0 0 7.3 20.5h9.4a2 2 0 0 0 1.8-2.9L14 9V2'), l(8, 15, 16, 15)] },

  // ── Misc HUD ──────────────────────────────────────────────────────────
  save: { meaning: 'Save game', els: [r(4, 4, 16, 16, 1), p('M7 4v5h8V4'), r(7, 13, 10, 7)] },
  mute: { meaning: 'Sound muted', els: [pg('3,9 7,9 12,5 12,19 7,15 3,15'), l(15, 9, 20, 15), l(20, 9, 15, 15)] },
  unmute: { meaning: 'Sound on', els: [pg('3,9 7,9 12,5 12,19 7,15 3,15'), p('M16 8a5 5 0 0 1 0 8'), p('M18.5 5.5a9 9 0 0 1 0 13')] },
  music: { meaning: 'Music toggle', els: [c(6, 18, 2.2, 'none'), c(16, 16, 2.2, 'none'), l(8, 18, 8, 5), l(18, 16, 18, 3), l(8, 5, 18, 3)] },
  ambient: { meaning: 'Ambient audio toggle', els: [p('M4 14a8 8 0 0 1 16 0'), l(4, 14, 4, 18), l(20, 14, 20, 18), r(2, 14, 4, 6, 1), r(18, 14, 4, 6, 1)] },
  // Wave V7 (docs/VISUAL_DEPTH_2026-08.md §V7): haptics toggle in ResourceBar —
  // a phone body with a pulse/motion mark; 'haptics-off' adds a strike-through
  // so the on/off state is never conveyed by color alone (mirrors mute/unmute).
  haptics: { meaning: 'Haptic feedback toggle — on', els: [r(8, 2, 8, 20, 2), l(11, 19, 13, 19), p('M4 9l1.5 1.5L4 12l1.5 1.5L4 15', 'none'), p('M20 9l-1.5 1.5L20 12l-1.5 1.5L20 15', 'none')] },
  'haptics-off': { meaning: 'Haptic feedback toggle — off', els: [r(8, 2, 8, 20, 2), l(11, 19, 13, 19), l(4, 4, 20, 20)] },
  // Wave V8 (docs/VISUAL_DEPTH_2026-08.md §V8): density toggle in ResourceBar —
  // row count is the shape signal (3 widely-spaced rows vs 5 tightly-packed
  // rows), never color alone, mirroring the haptics on/off precedent.
  'density-comfortable': { meaning: 'Display density: comfortable (wider spacing)', els: [l(4, 6, 20, 6), l(4, 12, 20, 12), l(4, 18, 20, 18)] },
  'density-compact': { meaning: 'Display density: compact (denser rows)', els: [l(4, 4, 20, 4), l(4, 8, 20, 8), l(4, 12, 20, 12), l(4, 16, 20, 16), l(4, 20, 20, 20)] },
  restart: { meaning: 'Restart game', els: [p('M4 12a8 8 0 1 1 2.3 5.6'), pl('4,17 4,12 9,12')] },
  quit: { meaning: 'Quit to menu', els: [p('M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5'), l(9, 12, 21, 12), pl('17,8 21,12 17,16')] },
  help: { meaning: 'Help / how to play', els: [c(12, 12, 9, 'none'), p('M9 9a3 3 0 1 1 4 2.8c-.8.5-1 1-1 2.2'), c(12, 17, 0.6, 'currentColor')] },
  more: { meaning: 'More options', els: [c(5, 12, 1.4, 'currentColor'), c(12, 12, 1.4, 'currentColor'), c(19, 12, 1.4, 'currentColor')] },
  close: { meaning: 'Close / dismiss', els: [l(5, 5, 19, 19), l(19, 5, 5, 19)] },
  'chevron-up': { meaning: 'Expand upward / collapse', els: [pl('5,15 12,8 19,15')] },
  'chevron-down': { meaning: 'Expand downward', els: [pl('5,9 12,16 19,9')] },
  check: { meaning: 'Confirmed / satisfied condition', els: [pl('4,13 9,18 20,6')] },
  warning: { meaning: 'Warning / caution', els: [p('M12 3l10 18H2z'), l(12, 9, 12, 14), c(12, 17, 0.6, 'currentColor')] },
  info: { meaning: 'Informational note', els: [c(12, 12, 9, 'none'), l(12, 11, 12, 16), c(12, 8, 0.6, 'currentColor')] },
  activity: { meaning: 'Live activity feed', els: [p('M4 12a8 8 0 0 1 8-8'), p('M4 12a8 8 0 0 0 8 8'), c(12, 12, 2.4, 'currentColor'), l(12, 4, 12, 2), l(12, 20, 12, 22)] },
  money: { meaning: 'Money / revenue', els: [c(12, 12, 9, 'none'), p('M14 8.5c-.5-.6-1.4-1-2.4-1-1.8 0-3 1-3 2.3 0 3 5.6 1.6 5.6 4.6 0 1.4-1.4 2.4-3.2 2.4-1.2 0-2.2-.5-2.8-1.2')] },
  'trending-up': { meaning: 'Value trending up', els: [pl('4,17 9,11 13,14 20,5'), pl('15,5 20,5 20,10')] },
  'trending-down': { meaning: 'Value trending down', els: [pl('4,7 9,13 13,10 20,19'), pl('15,19 20,19 20,14')] },
  handshake: { meaning: 'Alliance / agreement', els: [p('M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'), p('M16 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'), p('M4 20c0-3 2-5 4-5s4 2 4 5'), p('M12 20c0-3 2-5 4-5s4 2 4 5')] },
  package: { meaning: 'Cargo / bounty package', els: [pg('12,3 21,8 21,16 12,21 3,16 3,8'), l(3, 8, 12, 13), l(12, 13, 21, 8), l(12, 13, 12, 21), l(7, 5.5, 16, 10.5)] },
  target: { meaning: 'Bid / contested objective', els: [c(12, 12, 8, 'none'), c(12, 12, 4, 'none'), c(12, 12, 0.8, 'currentColor')] },
  swords: { meaning: 'Conflict / rivalry', els: [l(5, 5, 19, 19), l(19, 5, 5, 19), pl('5,5 5,8 8,5'), pl('19,19 19,16 16,19'), pl('19,5 19,8 16,5'), pl('5,19 5,16 8,19')] },
  scroll: { meaning: 'Charter / official record', els: [r(6, 3, 12, 17, 1), l(9, 8, 15, 8), l(9, 12, 15, 12), l(9, 16, 13, 16), l(6, 20, 18, 20)] },
  sparkle: { meaning: 'New / unlocked', els: [p('M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z'), c(19, 18, 1.4, 'currentColor')] },
  'external-link': { meaning: 'Opens another surface', els: [p('M14 4h6v6'), l(20, 4, 11, 13), p('M18 14v6H4V6h6')] },
  'arrow-up': { meaning: 'Increased / promoted', els: [l(12, 19, 12, 5), pl('6,11 12,5 18,11')] },
  'arrow-down': { meaning: 'Decreased / demoted', els: [l(12, 5, 12, 19), pl('6,13 12,19 18,13')] },
  calendar: { meaning: 'Mission calendar', els: [r(4, 5, 16, 16, 2), l(4, 10, 20, 10), l(8, 3, 8, 7), l(16, 3, 16, 7)] },
  clock: { meaning: 'Elapsed / remaining time', els: [c(12, 12, 8, 'none'), l(12, 12, 12, 7), l(12, 12, 15.5, 14)] },
  shield: { meaning: 'Protection / defensive status', els: [p('M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z')] },
  city: { meaning: 'Colony / settlement', els: [r(3, 10, 6, 11), r(10, 5, 5, 16), r(16, 12, 5, 9), l(5, 13, 5, 13), l(5, 16, 5, 16), l(12, 8, 12, 8), l(12, 11, 12, 11), l(12, 14, 12, 14)] },
  comet: { meaning: 'Expedition / far-flight trail', els: [c(16, 8, 3, 'none'), l(3, 21, 13, 11), l(3, 21, 8, 20), l(3, 21, 4, 16)] },
  'cargo-truck': { meaning: 'Loaded freight ship', els: [r(2, 12, 11, 5, 1), pg('13,14 18,14 21,17 21,17 21,17 13,17'), c(7, 19, 1.6, 'none'), c(18, 19, 1.6, 'none')] },
  lock: { meaning: 'Locked / prerequisite not met', els: [r(5, 11, 14, 10, 2), p('M8 11V7a4 4 0 0 1 8 0v4'), c(12, 16, 1, 'currentColor')] },
  idea: { meaning: 'Suggestion / tip', els: [p('M9 18h6'), p('M10 21h4'), p('M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z')] },
  balance: { meaning: 'Governed by corporate doctrine', els: [l(12, 3, 12, 19), l(6, 7, 18, 7), p('M6 7l-3 6a3 3 0 0 0 6 0z'), p('M18 7l-3 6a3 3 0 0 0 6 0z'), l(9, 20, 15, 20)] },
  alien: { meaning: 'First contact / extraterrestrial', els: [p('M12 3C7 3 4 7 4 11c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10 0-4-3-8-8-8z'), c(9, 11, 1.2, 'currentColor'), c(15, 11, 1.2, 'currentColor')] },
  archive: { meaning: 'Historical registry / archive', els: [r(4, 4, 16, 5, 1), r(5, 9, 14, 11, 1), l(10, 12, 14, 12)] },
  globe: { meaning: 'Global / economy-wide scope', els: [c(12, 12, 9, 'none'), p('M3 12h18'), p('M12 3c3 2.5 4.5 6 4.5 9s-1.5 6.5-4.5 9c-3-2.5-4.5-6-4.5-9s1.5-6.5 4.5-9z')] },
  wrench: { meaning: 'Repair / maintenance action', els: [p('M14.5 3a4.5 4.5 0 0 0-5.7 5.7L3 14.5 6.5 18l5.8-5.8A4.5 4.5 0 0 0 18 6.5l-3 3-2.5-2.5z')] },
  idle: { meaning: 'Idle / awaiting orders', els: [p('M19 13a7 7 0 1 1-8-9.9A7 7 0 0 0 19 13z')] },
  edit: { meaning: 'Edit / rename', els: [p('M15 3l6 6-11 11H4v-6z'), l(14, 4, 20, 10)] },
  power: { meaning: 'Electrical power / energy grid', els: [pg('13,2 4,14 11,14 9,22 20,9 12,9 13,2')] },
  npc: { meaning: 'Automated NPC / AI-driven activity', els: [r(6, 8, 12, 9, 2), l(9, 8, 9, 5), l(15, 8, 15, 5), c(9.5, 12.5, 1, 'currentColor'), c(14.5, 12.5, 1, 'currentColor'), l(3, 12, 6, 12), l(18, 12, 21, 12)] },
};

/** Best-effort emoji → IconName bridge for data-sourced glyphs (season
 *  themes, alliance-event defs, league metrics, era charters, etc.) that
 *  live outside src/components/game/ and are out of this wave's sweep
 *  scope. Extend this map as those files migrate; callers should always
 *  provide a `fallback` IconName so an unmapped glyph never renders blank —
 *  worst case it silently falls through to the fallback icon rather than
 *  the raw emoji, keeping the UI's iconography internally consistent. */
const EMOJI_TO_ICON: Record<string, IconName> = {
  '📜': 'scroll', '🤝': 'handshake', '🏛️': 'governance', '🎓': 'track-crew-cohort',
  '🎖️': 'commanders', '🧪': 'science', '🔬': 'research', '🏗️': 'build',
  '🚀': 'fleet', '🛰️': 'megastructures', '🌟': 'seasons', '🌐': 'cal-realignment',
  '⚛️': 'resource-exotic', '💰': 'money', '🎯': 'target', '⚔️': 'swords',
  '📦': 'package', '🏆': 'leaderboard', '📡': 'services', '🌠': 'comet',
};

/** Resolve a data-sourced emoji glyph to a registered IconName, falling
 *  back to `fallback` when the glyph isn't mapped. Never throws. */
export function resolveIcon(glyph: string | undefined | null, fallback: IconName): IconName {
  if (!glyph) return fallback;
  return EMOJI_TO_ICON[glyph] || fallback;
}

/** world-calendar.ts CalendarCategory → IconName. Mechanical `cal-` prefix +
 *  underscore→dash — kept as a function (not a literal Record) so adding a
 *  new CalendarCategory to world-calendar.ts and forgetting the matching
 *  `cal-*` ICONS entry fails loudly in registry-completeness tests rather
 *  than silently falling back. */
export function calendarCategoryIcon(category: string): IconName {
  const name = (`cal-${category.replace(/_/g, '-')}`) as IconName;
  return ICONS[name] ? name : 'calendar';
}

/** resources.ts ResourceDefinition.category → IconName. Same mechanical
 *  `resource-` prefix convention as calendarCategoryIcon above. */
export function resourceCategoryIcon(category: string): IconName {
  const name = (`resource-${category.replace(/_/g, '-')}`) as IconName;
  return ICONS[name] ? name : 'resource-generic';
}
