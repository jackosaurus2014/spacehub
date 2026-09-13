// ─── Canvas-drawn map glyphs ─────────────────────────────────────────────────
// The two solar renderers paint a handful of text glyphs INTO canvas
// textures / 2D-canvas labels (no DOM, no icon component can reach them):
// the zone-standing marks that ride in a body's label, the hazard-forecast
// mark and the science-mission instrument mark. They are shape signals
// (colourblind-safe reinforcement of a colour tint), which is why they
// survive the GameIcon migration that removed every emoji from the game's
// DOM (graphics review 2026-09-12 item 10). They live here — outside the
// guarded component directories — so the icon-migration guard test can
// keep src/components/game and src/app/space-tycoon literal-emoji-free
// while the canvases keep drawing them. DOM surfaces that mirror these
// (the Location Lists) use GameIcon 'crown' / 'diamond' / 'warning' /
// 'science' instead.

export const MAP_GLYPHS = {
  /** Zone governor — gold crown before the location name. */
  governor: '♛',
  /** Zone stakeholder — cyan diamond before the location name. */
  stakeholder: '◆',
  /** Severe-hazard forecast for the coming month (text presentation form). */
  warning: '⚠︎',
  /** Active flagship science mission at this body. */
  science: '\u{1F52C}',
} as const;
