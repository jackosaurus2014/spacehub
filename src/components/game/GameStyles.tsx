'use client';

/**
 * AAA-quality game CSS styles, animations, and visual effects.
 * Implements glassmorphism, neon glow, particle shimmer, and
 * cinematic micro-interactions for a premium game feel.
 *
 * Panel taxonomy (Wave V5, docs/VISUAL_DEPTH_2026-08.md §V5) — three tiers,
 * codified as wrapper components in src/components/game/chrome.tsx so new
 * surfaces compose instead of re-deriving Tailwind stacks by hand:
 *   1. ConsolePanel — hud-frame + corner brackets + `.hub-section-header`
 *      header band (icon + title + optional subtitle/right-slot) + optional
 *      `.console-art-keyline` art backdrop. The top-level hub/section wrapper.
 *   2. HoloCard — `.holo-card` game-panel surface + hover lift, for repeated
 *      items inside a ConsolePanel (building cards, roster rows, queue items).
 *   3. DataChip — small inline pill for a labeled stat/status readout,
 *      replacing ad-hoc `text-[9px] px-1.5` chip spans.
 * Type floor (rides with V8): display 18 / HUD 12 / body 11 / label 10 /
 * micro 9 (tooltip-backed only) — nothing routed through chrome.tsx goes
 * below 10px for load-bearing text.
 */
export default function GameStyles() {
  return (
    <style jsx global>{`
      /* ═══════════════════════════════════════════════════════════════════
         GLASSMORPHISM PANELS — frosted glass effect for game panels
         ═══════════════════════════════════════════════════════════════════ */
      .game-panel {
        background: rgba(10, 10, 20, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
      }

      .game-panel-glow {
        background: rgba(10, 10, 20, 0.85);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(6, 182, 212, 0.15);
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(6, 182, 212, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      /* ═══════════════════════════════════════════════════════════════════
         CARD SYSTEM — hover lift, glow states, interactive cards
         ═══════════════════════════════════════════════════════════════════ */
      .game-card {
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                    border-color 0.2s ease,
                    box-shadow 0.3s ease;
        will-change: transform;
      }
      .game-card:hover {
        transform: translateY(-3px) scale(1.005);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06);
      }

      .game-card-interactive {
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      .game-card-interactive::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.05), transparent 60%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .game-card-interactive:hover::before {
        opacity: 1;
      }

      /* ═══════════════════════════════════════════════════════════════════
         GLOW EFFECTS — neon accents for active/highlighted elements
         ═══════════════════════════════════════════════════════════════════ */
      .game-glow-cyan {
        box-shadow: 0 0 15px rgba(6, 182, 212, 0.2), 0 0 40px rgba(6, 182, 212, 0.05);
      }
      .game-glow-purple {
        box-shadow: 0 0 15px rgba(139, 92, 246, 0.2), 0 0 40px rgba(139, 92, 246, 0.05);
      }
      .game-glow-green {
        box-shadow: 0 0 15px rgba(34, 197, 94, 0.2), 0 0 40px rgba(34, 197, 94, 0.05);
      }
      .game-glow-amber {
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.2), 0 0 40px rgba(245, 158, 11, 0.05);
      }

      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.15); }
        50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1); }
      }
      .game-glow-pulse {
        animation: glow-pulse 2s ease-in-out infinite;
      }

      @keyframes glow-pulse-cyan {
        0%, 100% { box-shadow: 0 0 8px rgba(6, 182, 212, 0.15); }
        50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1); }
      }
      .glow-pulse-cyan { animation: glow-pulse-cyan 2s ease-in-out infinite; }

      @keyframes glow-pulse-green {
        0%, 100% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.15); }
        50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
      }
      .glow-pulse-green { animation: glow-pulse-green 2s ease-in-out infinite; }

      @keyframes glow-pulse-amber {
        0%, 100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.15); }
        50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
      }
      .glow-pulse-amber { animation: glow-pulse-amber 2s ease-in-out infinite; }

      /* ═══════════════════════════════════════════════════════════════════
         BUTTON EFFECTS — press, glow, gradient
         ═══════════════════════════════════════════════════════════════════ */
      .game-btn {
        transition: transform 0.1s ease, box-shadow 0.25s ease, background 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .game-btn:active {
        transform: scale(0.95);
      }
      .game-btn:hover {
        box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
      }
      .game-btn::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      .game-btn:hover::after {
        opacity: 1;
      }

      .game-btn-primary {
        background: linear-gradient(135deg, #06b6d4, #8b5cf6);
        border: none;
        color: white;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .game-btn-primary:hover {
        background: linear-gradient(135deg, #22d3ee, #a78bfa);
        box-shadow: 0 0 25px rgba(6, 182, 212, 0.3), 0 0 50px rgba(139, 92, 246, 0.1);
      }

      /* ═══════════════════════════════════════════════════════════════════
         PROGRESS BARS — shimmer, gradient, animated
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .game-progress-shimmer {
        position: relative;
        overflow: hidden;
      }
      .game-progress-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        background-size: 200% 100%;
        animation: shimmer 2s linear infinite;
      }

      /* ═══════════════════════════════════════════════════════════════════
         ANIMATIONS — reveal, pop, pulse, float
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes money-flash {
        0% { text-shadow: 0 0 0 transparent; }
        50% { text-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 24px rgba(34, 197, 94, 0.2); }
        100% { text-shadow: 0 0 0 transparent; }
      }
      .money-flash { animation: money-flash 0.6s ease-out; }

      @keyframes resource-gain {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      .resource-gain { animation: resource-gain 0.3s ease-out; }

      @keyframes achievement-pop {
        0% { transform: scale(0.3); opacity: 0; }
        60% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); }
      }
      .achievement-pop {
        animation: achievement-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes slide-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .slide-in-right { animation: slide-in-right 0.3s ease-out; }

      @keyframes float-up-fade {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-40px); opacity: 0; }
      }
      .float-up-fade {
        animation: float-up-fade 1.2s ease-out forwards;
        pointer-events: none;
        position: absolute;
      }

      @keyframes construction-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      .construction-pulse { animation: construction-pulse 1.5s ease-in-out infinite; }

      /* ═══════════════════════════════════════════════════════════════════
         TAB SYSTEM — active indicator, hover states
         ═══════════════════════════════════════════════════════════════════ */
      .game-tab-active {
        position: relative;
        background: rgba(255, 255, 255, 0.06) !important;
      }
      .game-tab-active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 15%;
        right: 15%;
        height: 2px;
        background: linear-gradient(90deg, #06b6d4, #8b5cf6);
        border-radius: 2px;
        box-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
      }

      /* ═══════════════════════════════════════════════════════════════════
         TOOLTIPS — game-style with neon border
         DEPRECATED (Wave V2, docs/VISUAL_DEPTH_2026-08.md §V2): superseded
         by the portal-rendered <HoloTip> component (HoloTip.tsx) — a real
         element instead of an attr(data-tooltip) ::before string, so it can
         hold rich content and nested concept expansion. No remaining
         consumers of .game-tooltip in src/ as of V2; kept here (unused,
         harmless) rather than deleted in case an external/uncommitted
         surface still references it — safe to remove in a follow-up sweep.
         New tooltip adoption should use HoloTip, not this class.
         ═══════════════════════════════════════════════════════════════════ */
      .game-tooltip {
        position: relative;
      }
      .game-tooltip::before {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-6px);
        padding: 6px 10px;
        background: rgba(5, 5, 20, 0.95);
        border: 1px solid rgba(6, 182, 212, 0.2);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 11px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 50;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(6, 182, 212, 0.05);
      }
      .game-tooltip:hover::before {
        opacity: 1;
      }

      /* ═══════════════════════════════════════════════════════════════════
         SCROLLBAR — slim, themed
         ═══════════════════════════════════════════════════════════════════ */
      .game-scroll::-webkit-scrollbar { width: 4px; }
      .game-scroll::-webkit-scrollbar-track { background: transparent; }
      .game-scroll::-webkit-scrollbar-thumb {
        background: rgba(6, 182, 212, 0.15);
        border-radius: 4px;
      }
      .game-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(6, 182, 212, 0.3);
      }

      /* Tab bar — horizontal scroll with hidden scrollbar */
      .game-tab-bar {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
      }
      .game-tab-bar::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }

      /* ═══════════════════════════════════════════════════════════════════
         TYPOGRAPHY — game display text
         ═══════════════════════════════════════════════════════════════════ */
      .game-heading {
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .game-number {
        font-family: var(--font-hud), var(--font-mono), ui-monospace, monospace;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        letter-spacing: 0;
      }

      .game-label {
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #64748b;
      }

      /* Explicit utility — apply .font-hud to any element that should read as
         HUD chrome. Falls back gracefully if Orbitron hasn't loaded yet. */
      .font-hud {
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.04em;
      }

      /* Promote all tab labels + hud-frame numerics to the HUD face without
         needing to touch every call site. */
      .game-tab-bar button {
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.08em;
      }
      .hud-frame .font-mono,
      .hud-frame [class*="font-mono"] {
        font-family: var(--font-hud), var(--font-mono), ui-monospace, monospace;
      }

      /* ═══════════════════════════════════════════════════════════════════
         SECTION DIVIDERS — gradient line separators
         ═══════════════════════════════════════════════════════════════════ */
      .game-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15), transparent);
        border: none;
        margin: 16px 0;
      }

      /* ═══════════════════════════════════════════════════════════════════
         STATUS BADGES — tier, rarity, state indicators
         ═══════════════════════════════════════════════════════════════════ */
      .game-badge-t1 { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
      .game-badge-t2 { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); }
      .game-badge-t3 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
      .game-badge-t4 { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); }
      .game-badge-t5 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }

      /* ═══════════════════════════════════════════════════════════════════
         BACKGROUND EFFECTS — subtle animated nebula
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes nebula-drift {
        0% { transform: translate(0, 0) rotate(0deg); }
        33% { transform: translate(20px, -10px) rotate(2deg); }
        66% { transform: translate(-15px, 15px) rotate(-1deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      .game-nebula-bg {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
      }
      .game-nebula-bg::before {
        content: '';
        position: absolute;
        top: 20%;
        left: 30%;
        width: 600px;
        height: 400px;
        background: radial-gradient(ellipse, rgba(6, 182, 212, 0.03), transparent 70%);
        animation: nebula-drift 30s ease-in-out infinite;
      }
      .game-nebula-bg::after {
        content: '';
        position: absolute;
        bottom: 30%;
        right: 20%;
        width: 500px;
        height: 350px;
        background: radial-gradient(ellipse, rgba(139, 92, 246, 0.02), transparent 70%);
        animation: nebula-drift 25s ease-in-out infinite reverse;
      }

      /* ═══════════════════════════════════════════════════════════════════
         TUTORIAL — pulsing tab highlight for onboarding
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes tutorial-pulse {
        0%, 100% {
          background-color: rgba(6, 182, 212, 0.06);
          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
        }
        50% {
          background-color: rgba(6, 182, 212, 0.18);
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.25), inset 0 0 8px rgba(6, 182, 212, 0.08);
        }
      }
      .game-tutorial-pulse {
        animation: tutorial-pulse 1.8s ease-in-out infinite;
        border-radius: 8px;
      }

      /* ═══════════════════════════════════════════════════════════════════
         MOBILE OPTIMIZATIONS
         ═══════════════════════════════════════════════════════════════════ */
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

      @media (max-width: 640px) {
        .game-card:hover {
          transform: none; /* Disable hover lift on touch devices */
        }
      }

      /* ═══════════════════════════════════════════════════════════════════
         HUD CHROME — corner brackets + scanlines for the command-center feel
         ═══════════════════════════════════════════════════════════════════ */

      /* Corner-bracket decoration. Wrap a container with .hud-frame and it gets
         four small angle brackets at the corners. Color via --hud-color. */
      .hud-frame {
        --hud-color: rgba(34, 211, 238, 0.35);
      }
      /* The corner brackets are positioned against this box, so .hud-frame
         needs a positioning context — but it must not FIGHT one. As a plain
         class selector it ties on specificity with Tailwind's absolute
         utility, and this stylesheet is injected after Tailwind, so source
         order made hud-frame win: every HUD panel marked "hud-frame absolute"
         silently laid out in normal flow instead. That put the location
         command panel below the map entirely, so picking a location looked
         like it did nothing. :where() drops this rule to zero specificity so
         any position utility on the element wins. */
      :where(.hud-frame) {
        position: relative;
      }
      .hud-frame::before,
      .hud-frame::after,
      .hud-frame > .hud-corner-bl,
      .hud-frame > .hud-corner-br {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        border-color: var(--hud-color);
        border-style: solid;
        pointer-events: none;
        transition: border-color 0.4s ease;
      }
      .hud-frame::before { top: -1px; left: -1px; border-width: 1.5px 0 0 1.5px; }
      .hud-frame::after  { top: -1px; right: -1px; border-width: 1.5px 1.5px 0 0; }
      .hud-frame > .hud-corner-bl { bottom: -1px; left: -1px; border-width: 0 0 1.5px 1.5px; }
      .hud-frame > .hud-corner-br { bottom: -1px; right: -1px; border-width: 0 1.5px 1.5px 0; }

      .hud-frame-amber  { --hud-color: rgba(245, 158, 11, 0.45); }
      .hud-frame-purple { --hud-color: rgba(167, 139, 250, 0.45); }
      .hud-frame-red    { --hud-color: rgba(239, 68, 68, 0.45); }

      /* Scanline overlay. Apply to the root game shell for a CRT-monitor feel.
         Almost invisible but subconsciously reads as "display". */
      .hud-scanlines {
        position: relative;
      }
      .hud-scanlines::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 5;
        background: repeating-linear-gradient(
          to bottom,
          transparent 0,
          transparent 2px,
          rgba(255, 255, 255, 0.015) 2px,
          rgba(255, 255, 255, 0.015) 3px
        );
        mix-blend-mode: overlay;
      }
      @media (prefers-reduced-motion: reduce) {
        .hud-scanlines::before { display: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         REGION BACKDROPS — CSS-variable driven tint that shifts by location.
         The root app div reads data-region and swaps --region-a/b/accent.
         ═══════════════════════════════════════════════════════════════════ */
      .region-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background:
          radial-gradient(ellipse at 20% 30%, var(--region-a, rgba(6,182,212,0.06)), transparent 55%),
          radial-gradient(ellipse at 80% 70%, var(--region-b, rgba(139,92,246,0.04)), transparent 55%);
        transition: background 1.2s ease;
      }
      .region-backdrop::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: var(--region-texture, none);
        background-size: cover;
        background-position: center;
        opacity: 0.05;
        mix-blend-mode: screen;
        transition: opacity 1.2s ease, background-image 1.2s ease;
      }

      /* ═══════════════════════════════════════════════════════════════════
         DELTA FLASHES — brief color flash on value change
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes delta-up {
        0%   { background-color: rgba(34, 197, 94, 0.35); color: #bbf7d0; }
        100% { background-color: transparent; color: inherit; }
      }
      @keyframes delta-down {
        0%   { background-color: rgba(239, 68, 68, 0.35); color: #fecaca; }
        100% { background-color: transparent; color: inherit; }
      }
      .delta-flash-up   { animation: delta-up 0.9s ease-out; border-radius: 6px; }
      .delta-flash-down { animation: delta-down 0.9s ease-out; border-radius: 6px; }

      /* ═══════════════════════════════════════════════════════════════════
         HOLOGRAM TREATMENTS — subtle scan/flicker for portrait + ship art
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes holo-sweep {
        0%   { background-position: 0% 0%; opacity: 0.9; }
        50%  { background-position: 0% 100%; opacity: 0.6; }
        100% { background-position: 0% 0%; opacity: 0.9; }
      }
      .holo-sprite {
        position: relative;
        overflow: hidden;
      }
      .holo-sprite::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          transparent 0%,
          rgba(34, 211, 238, 0.12) 50%,
          transparent 100%
        );
        background-size: 100% 200%;
        animation: holo-sweep 3.2s linear infinite;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      @media (prefers-reduced-motion: reduce) {
        .holo-sprite::after { display: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         MODAL ENTRY — scale + fade when modal mounts. Applies to the inner
         .game-modal-card; outer backdrop fades in via .game-modal-backdrop.
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes modal-scale-in {
        from { opacity: 0; transform: scale(0.94) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes modal-backdrop-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .game-modal-card {
        animation: modal-scale-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1) both;
      }
      .game-modal-backdrop {
        animation: modal-backdrop-in 0.18s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .game-modal-card,
        .game-modal-backdrop { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         HAZARD REACTION — screen flash + banner slide
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes hazard-flash {
        0%   { opacity: 0; }
        20%  { opacity: 1; }
        100% { opacity: 0; }
      }
      .hazard-flash { animation: hazard-flash 0.65s ease-out both; }

      @keyframes hazard-slide-in {
        from { transform: translateX(40px); opacity: 0; }
        to   { transform: translateX(0); opacity: 1; }
      }
      .hazard-alert-banner {
        animation: hazard-slide-in 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .hazard-flash,
        .hazard-alert-banner { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         MILESTONE VIGNETTE — full-screen celebration overlay
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes milestone-dim {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes milestone-glow-in {
        0%   { transform: scale(0.6) translateY(20px); opacity: 0; letter-spacing: 1em; }
        60%  { transform: scale(1.05) translateY(0); opacity: 1; letter-spacing: 0.3em; }
        100% { transform: scale(1) translateY(0); opacity: 1; letter-spacing: 0.18em; }
      }
      @keyframes milestone-sub-fade {
        0%   { opacity: 0; transform: translateY(8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes milestone-ring-expand {
        0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
      }
      .milestone-overlay       { animation: milestone-dim 0.5s ease-out both; }
      .milestone-headline      { animation: milestone-glow-in 0.9s cubic-bezier(0.34, 1.2, 0.64, 1) both; }
      .milestone-subtitle      { animation: milestone-sub-fade 0.6s ease-out 0.5s both; }
      .milestone-ring          { animation: milestone-ring-expand 1.4s ease-out both; }
      @media (prefers-reduced-motion: reduce) {
        .milestone-overlay,
        .milestone-headline,
        .milestone-subtitle,
        .milestone-ring { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         CINEMATIC OVERLAY (4X Wave W5) — full-screen presentation moments,
         generalized from the milestone vignette above: narrative chain-head
         arrivals, science-mission discoveries, expedition/first-contact
         arrivals, victories, megastructure completions. One at a time from
         a client-side queue (src/lib/game/cinematic-moments.ts).
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes cinematic-dim {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes cinematic-kenburns {
        0%   { transform: scale(1.0) translate(0, 0); }
        100% { transform: scale(1.09) translate(-1.5%, -1%); }
      }
      @keyframes cinematic-title-in {
        0%   { transform: translateY(16px); opacity: 0; letter-spacing: 0.9em; }
        60%  { opacity: 1; letter-spacing: 0.28em; }
        100% { transform: translateY(0); opacity: 1; letter-spacing: 0.16em; }
      }
      @keyframes cinematic-subtitle-in {
        0%   { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes cinematic-btn-in {
        0%   { opacity: 0; transform: translateY(6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes cinematic-bar-shrink {
        from { transform: scaleX(1); }
        to   { transform: scaleX(0); }
      }
      .cinematic-overlay    { animation: cinematic-dim 0.45s ease-out both; }
      .cinematic-art        { animation: cinematic-kenburns 8.2s ease-out both; }
      .cinematic-title      { animation: cinematic-title-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .cinematic-subtitle   { animation: cinematic-subtitle-in 0.7s ease-out 0.55s both; }
      .cinematic-continue   { animation: cinematic-btn-in 0.6s ease-out 0.8s both; }
      .cinematic-bar-fill   { animation: cinematic-bar-shrink 8s linear both; transform-origin: left; }
      @media (prefers-reduced-motion: reduce) {
        .cinematic-overlay,
        .cinematic-art,
        .cinematic-title,
        .cinematic-subtitle,
        .cinematic-continue,
        .cinematic-bar-fill { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         SPARKLINE — tiny SVG trend line next to the money readout
         ═══════════════════════════════════════════════════════════════════ */
      .sparkline path {
        fill: none;
        stroke-width: 1.25;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 2px currentColor);
      }

      /* ═══════════════════════════════════════════════════════════════════
         HOLO-PORTRAIT (sprite framing) — used on build + fleet cards
         ═══════════════════════════════════════════════════════════════════ */
      .sprite-frame {
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(ellipse at 50% 120%, rgba(34,211,238,0.18), transparent 70%),
          linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.3));
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
      }
      .sprite-frame::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(to bottom, transparent 95%, rgba(34,211,238,0.15) 100%),
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 3px,
            rgba(34,211,238,0.035) 3px,
            rgba(34,211,238,0.035) 4px
          );
        pointer-events: none;
        border-radius: inherit;
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE 3 — RANKING / ROSTER / SEASON-TRACK CHROME
         Command-center treatment shared by Leaderboard, League, Rivals,
         Commanders, Season Pass and Speed Run panels.
         ═══════════════════════════════════════════════════════════════════ */

      /* Holo ranking row — replaces plain <tr> rows in ranking lists */
      .holo-row {
        position: relative;
        transition: background 0.2s ease;
      }
      .holo-row:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      .holo-row-you {
        background: linear-gradient(90deg, rgba(34, 211, 238, 0.08), transparent 75%);
      }

      /* Rank medal frame — circular holo mount for ach-badge art reused as rank medals */
      .rank-medal {
        position: relative;
        border-radius: 9999px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .rank-medal-gold {
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.45), inset 0 0 0 1.5px rgba(245, 158, 11, 0.65);
      }
      .rank-medal-silver {
        box-shadow: 0 0 8px rgba(203, 213, 225, 0.35), inset 0 0 0 1.5px rgba(203, 213, 225, 0.55);
      }
      .rank-medal-bronze {
        box-shadow: 0 0 8px rgba(180, 120, 60, 0.4), inset 0 0 0 1.5px rgba(196, 138, 82, 0.6);
      }

      /* Division / league badge chip — colors set inline per-league via style prop */
      .division-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        padding: 3px 10px;
        border-radius: 9999px;
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border-width: 1px;
        border-style: solid;
      }

      /* Promotion / relegation zone rows — border + background, always paired with a text+glyph tag */
      .zone-promotion {
        border-left: 2px solid rgba(34, 197, 94, 0.6);
        background: rgba(34, 197, 94, 0.04);
      }
      .zone-relegation {
        border-left: 2px solid rgba(239, 68, 68, 0.6);
        background: rgba(239, 68, 68, 0.04);
      }

      /* Season-pass reward track node */
      .season-node {
        position: relative;
      }
      .season-node-claimed {
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
      }
      .season-node-current {
        animation: glow-pulse-cyan 2s ease-in-out infinite;
      }

      /* Speed-run timer HUD readout */
      .timer-hud {
        font-family: var(--font-hud), var(--font-mono), ui-monospace, monospace;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.04em;
        text-shadow: 0 0 12px rgba(34, 211, 238, 0.5), 0 0 28px rgba(34, 211, 238, 0.15);
      }
      @keyframes timer-tick {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }
      .timer-hud-live { animation: timer-tick 1s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .timer-hud-live { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE 4 — INTEL / TERRITORY / SPATIAL / MODULE / ANOMALY / MEGAPROJECT
         CHROME. Shared by Espionage, Territory, Spatial Strategy, Modules,
         Anomalies, Mega-Project and Megastructure panels.
         ═══════════════════════════════════════════════════════════════════ */

      /* Intel dossier card — classified-briefing treatment for espionage ops */
      .intel-dossier {
        position: relative;
        background: linear-gradient(160deg, rgba(20, 6, 6, 0.5), rgba(10, 10, 20, 0.85));
      }
      .dossier-stamp {
        position: absolute;
        top: 8px;
        right: 6px;
        transform: rotate(6deg);
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-size: 10px; /* V8 type floor — was 8px */
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        padding: 2px 7px;
        border: 1px solid rgba(239, 68, 68, 0.45);
        color: rgba(248, 113, 113, 0.85);
        background: rgba(239, 68, 68, 0.08);
        border-radius: 3px;
        pointer-events: none;
      }

      /* VFX sprite accents — purely decorative, never load-bearing information */
      .vfx-sprite {
        pointer-events: none;
        opacity: 0.55;
      }
      @keyframes vfx-pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50%      { opacity: 0.6; transform: scale(1.04); }
      }
      .vfx-pulse { animation: vfx-pulse 3.6s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .vfx-pulse { animation: none; opacity: 0.45; }
      }

      /* Chokepoint / territory control cards */
      .chokepoint-card {
        position: relative;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .contested-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3em;
        padding: 2px 8px;
        border-radius: 9999px;
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-size: 10px; /* V8 type floor — was 9px */
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border-width: 1px;
        border-style: solid;
      }

      /* Delta-v route cards — Spatial Strategy lane rows */
      .route-card {
        position: relative;
        overflow: hidden;
      }
      .route-line {
        position: relative;
        height: 2px;
        background: linear-gradient(90deg, rgba(34,211,238,0.5), rgba(139,92,246,0.5));
        border-radius: 2px;
      }

      /* Module fitting socket — holo mount for ModulesPanel hardpoint slots */
      .module-socket {
        position: relative;
        border-radius: 10px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .module-socket-filled {
        box-shadow: 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 0 1px rgba(34, 211, 238, 0.15);
      }
      .module-socket-empty {
        background: repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 6px, transparent 6px 12px);
      }

      /* Holo table — replaces plain <table> chrome in ranking / contribution lists */
      .holo-table {
        border-collapse: separate;
        border-spacing: 0;
      }
      .holo-table thead th {
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 10px; /* V8 type floor — was 9px */
      }
      .holo-table tbody tr {
        transition: background 0.2s ease;
      }
      .holo-table tbody tr:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      /* Mega-project phase track — season-pass-style horizontal progress track */
      .phase-track-node {
        position: relative;
      }
      .phase-track-node-complete {
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.25);
      }
      .phase-track-node-current {
        animation: glow-pulse-amber 2s ease-in-out infinite;
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE V5 — PANEL MATERIALITY UNIFICATION CHROME (chrome.tsx)
         Shared header-band / keyline / card classes consumed by
         <ConsolePanel>/<HoloCard>/<DataChip> so every hub + LS surface reads
         as the same command-center console instead of re-deriving its own
         Tailwind stack. Type floor here matches V8's documented scale
         (display 18 / HUD 12 / body 11 / label 10) — no 8-9px load-bearing
         text in anything routed through these classes.
         ═══════════════════════════════════════════════════════════════════ */
      .hub-section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding-bottom: 10px;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .hub-section-header-compact {
        padding-bottom: 6px;
        margin-bottom: 8px;
        align-items: center;
      }
      .hub-section-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: rgba(6, 182, 212, 0.08);
        border: 1px solid rgba(6, 182, 212, 0.15);
        color: #22d3ee;
      }
      .hub-section-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }

      /* Faint full-bleed art keyline behind a ConsolePanel — region banners,
         system vistas. Always decorative (alt=""); content sits on a dark
         wash so text contrast never depends on the image. */
      .console-art-keyline {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        border-radius: inherit;
      }
      .console-art-keyline img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.16;
      }
      .console-art-keyline::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(5,5,16,0.55) 0%, rgba(5,5,16,0.88) 70%, rgba(5,5,16,0.96) 100%);
      }

      /* HoloCard hover lift — mirrors .game-card but scoped so chrome.tsx
         doesn't have to also apply .game-card by hand. */
      .holo-card {
        transition: transform 0.2s cubic-bezier(0.34, 1.4, 0.64, 1), border-color 0.2s ease, background 0.2s ease;
      }
      @media (hover: hover) {
        button.holo-card:hover, div.holo-card[role="button"]:hover {
          background: rgba(255, 255, 255, 0.035);
        }
      }
      @media (max-width: 640px) {
        .hub-section-header {
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .hub-section-icon {
          width: 26px;
          height: 26px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .holo-card { transition: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE 7 — REDUCED MOTION GUARDS for animation classes defined above
         that predate the prefers-reduced-motion sweep. Disabling the
         animation leaves the element at its default (fully visible, no
         transform) state, since none of these rules set other properties.
         ═══════════════════════════════════════════════════════════════════ */
      @media (prefers-reduced-motion: reduce) {
        .game-glow-pulse,
        .glow-pulse-cyan,
        .glow-pulse-green,
        .glow-pulse-amber,
        .game-progress-shimmer::after,
        .money-flash,
        .resource-gain,
        .achievement-pop,
        .slide-in-right,
        .float-up-fade,
        .construction-pulse,
        .game-nebula-bg::before,
        .game-nebula-bg::after,
        .game-tutorial-pulse,
        .season-node-current,
        .phase-track-node-current {
          animation: none !important;
        }
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE V2 — HOLOTIP: unified tooltip + nested concept layer
         (docs/VISUAL_DEPTH_2026-08.md §V2). Portal-rendered panel — see
         HoloTip.tsx. Self-contained reduced-motion guard (does not need to
         join the WAVE 7 list above since it's a new class, not a legacy one).
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes holotip-pop-in {
        from { opacity: 0; transform: scale(0.96) translateY(4px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .holotip-panel {
        animation: holotip-pop-in 0.12s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .holotip-panel { animation: none; }
      }
      .holotip-trigger {
        cursor: pointer;
      }
      .holotip-trigger:focus-visible {
        outline: 1.5px solid rgba(34, 211, 238, 0.6);
        outline-offset: 2px;
        border-radius: 3px;
      }
      .holo-concept-term {
        text-decoration: underline dotted rgba(34, 211, 238, 0.55);
        text-underline-offset: 2px;
        color: #67e8f9;
      }
      .holo-concept-term:hover,
      .holo-concept-term:focus-visible {
        color: #a5f3fc;
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE V7 — ORDER ACKNOWLEDGMENT & WORLD FEEDBACK (juice pass)
         (docs/VISUAL_DEPTH_2026-08.md §V7). Map-ping visuals themselves are
         driven by lib/game/map-ping.ts's pure lifetime math (JS-computed
         opacity/scale per frame, not CSS keyframes — see SolarSystemCanvas /
         SolarMap3D / GalacticMapView), so this section only carries the two
         genuinely CSS-only pieces: the tab cross-fade (replacing the blanket
         animate-reveal-up "pop" remount on tab switch) and the haptics
         toggle's icon-swap transition.
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes tab-crossfade-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .tab-crossfade {
        animation: tab-crossfade-in 0.12s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .tab-crossfade { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE V8 — TYPE SCALE, DENSITY MODES & CONTRAST FLOOR
         (docs/VISUAL_DEPTH_2026-08.md §V8). Type floor (documented, and now
         enforced across the sweep): display 18 / HUD 12 / body 11 / label 10
         / micro 9 (tooltip-backed only) — nothing in src/components/game or
         src/app/space-tycoon goes below 10px for load-bearing text.

         Density modes: data-density="comfortable"|"compact" is set on the
         game root (the outermost div in space-tycoon/page.tsx) by
         lib/game/density.ts + the ResourceBar settings-cluster toggle.
         Comfortable is the default and reproduces today's spacing exactly
         (the --density-scale custom property below resolves to 1, a no-op).
         Compact tightens the two centralized "panel sweep" primitives from
         chrome.tsx (ConsolePanel's body padding, .hub-section-header row
         height) by the spec's ~20% via a single custom property — new
         surfaces built on ConsolePanel/HoloCard/DataChip inherit the mode
         automatically; no per-component Tailwind literals were forked.

         Compact is forced back to comfortable under 640px (phones) via the
         min-width guards below, regardless of the stored preference —
         tightened padding on a phone risks the 44px touch-target floor
         (CLAUDE.md accessibility invariant), so the density toggle itself
         is also hidden under 640px in ResourceBar.tsx.
         ═══════════════════════════════════════════════════════════════════ */
      [data-density] {
        --density-scale: 1;
      }
      [data-density="compact"] {
        --density-scale: 0.8;
      }
      @media (max-width: 639px) {
        [data-density="compact"] {
          --density-scale: 1; /* compact unavailable on phones — force comfortable */
        }
      }

      .console-panel-pad {
        padding: calc(16px * var(--density-scale, 1));
      }
      .console-panel-pad-compact {
        /* ConsolePanel's own "compact" prop (nested sub-panel header) — a
           different axis than the density mode, so it still scales with it. */
        padding: calc(12px * var(--density-scale, 1));
      }

      /* Row-height tightening for the shared hub header band. */
      [data-density="compact"] .hub-section-header {
        padding-bottom: calc(10px * var(--density-scale, 1));
        margin-bottom: calc(12px * var(--density-scale, 1));
      }
      [data-density="compact"] .hub-section-header-compact {
        padding-bottom: calc(6px * var(--density-scale, 1));
        margin-bottom: calc(8px * var(--density-scale, 1));
      }

      /* Elements marked compact-reveal only render their content in compact
         mode on desktop/tablet — e.g. MarketPanel's inline scarcity readout
         (spec: "reveals extra columns... market rows show volatility
         inline"). Additive: the underlying data is always in the DOM in
         comfortable mode too via the row's title=/aria attributes, this
         class only governs the always-visible inline chip. */
      .density-compact-reveal {
        display: none;
      }
      @media (min-width: 640px) {
        [data-density="compact"] .density-compact-reveal {
          display: inline-flex;
        }
      }

      /* Contrast audit (spec's third V8 bullet). The site's real high-contrast
         mechanism is a "html.high-contrast" class toggled by
         useHighContrast.ts + globals.css (NOT the [data-contrast="high"]
         attribute the spec sketches — that attribute isn't wired up anywhere
         in the codebase, so these rules hook the mechanism that actually
         exists and actually reaches players who've turned the setting on).
         Bumps the lowest-opacity washes/borders on the two centralized V5
         chrome primitives (DataChip's tone borders/fills, hud-frame's glow
         color) roughly 0.03-0.08 -> 0.12-0.35, matching the site-wide
         high-contrast border bump above (border-white/10 -> 0.25). */
      html.high-contrast .hud-frame {
        --hud-color: rgba(34, 211, 238, 0.75) !important;
      }
      html.high-contrast .hud-frame-amber  { --hud-color: rgba(245, 158, 11, 0.85) !important; }
      html.high-contrast .hud-frame-purple { --hud-color: rgba(167, 139, 250, 0.85) !important; }
      html.high-contrast .hud-frame-red    { --hud-color: rgba(239, 68, 68, 0.85) !important; }
      html.high-contrast .border-white\\/\\[0\\.08\\] { border-color: rgba(255, 255, 255, 0.3) !important; }
      html.high-contrast .bg-white\\/\\[0\\.02\\]      { background-color: rgba(255, 255, 255, 0.06) !important; }
      html.high-contrast .border-green-500\\/25 { border-color: rgba(74, 222, 128, 0.65) !important; }
      html.high-contrast .bg-green-500\\/8      { background-color: rgba(74, 222, 128, 0.16) !important; }
      html.high-contrast .border-red-500\\/25   { border-color: rgba(248, 113, 113, 0.65) !important; }
      html.high-contrast .bg-red-500\\/8        { background-color: rgba(248, 113, 113, 0.16) !important; }
      html.high-contrast .border-amber-500\\/25 { border-color: rgba(251, 191, 36, 0.65) !important; }
      html.high-contrast .bg-amber-500\\/8      { background-color: rgba(251, 191, 36, 0.16) !important; }
      html.high-contrast .border-cyan-500\\/25  { border-color: rgba(34, 211, 238, 0.65) !important; }
      html.high-contrast .bg-cyan-500\\/8       { background-color: rgba(34, 211, 238, 0.16) !important; }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE A1 — PANEL MATERIALITY (docs/VISUAL_AAA_2026-08.md §A1.1)
         Master of Orion 2 benchmark: panels must read as physical hardware
         housings, not flat translucent tints. Three layers of construction:

           1. OUTER BEVEL  — a 1px lit top edge + shaded bottom edge, so the
              housing catches light from above like a moulded console shell.
           2. INSET WELL   — an inner vignette that pushes content *into* the
              housing instead of letting it float on a wash.
           3. HARDWARE     — corner brackets promoted to milled corner plates
              plus (on chrome.tsx primitives) screw dots + edge tick rulers.

         DELIBERATELY EXTENDS '.hud-frame' rather than forking a parallel
         system: 77 of the game's ~102 panel files already carry '.hud-frame',
         so the housing propagates for free with zero call-site edits.

         Why box-shadow and not background-image: 15 existing '.hud-frame'
         call sites also apply Tailwind 'bg-gradient-to-*' (which is
         'background-image'), so painting the bevel with gradients would
         silently erase their tints. box-shadow is free on all of them. The
         cost is that box-shadow-setting classes co-applied with '.hud-frame'
         (the 5 '.game-glow-*' / '.game-panel-glow' variants) must be
         re-composed explicitly — done immediately below via the
         higher-specificity '.hud-frame.game-glow-*' rules, which append the
         glow to the housing instead of replacing it. Elements running an
         animated glow-pulse keyframe lose the housing for the duration of
         the pulse (the animation owns box-shadow); those are small nodes
         (season/phase track pips), not panels, so it is not visible.

         Density: the inset-well spread scales with --density-scale, so
         compact mode gets a proportionally tighter housing rather than a
         cavernous one. High-contrast overrides live at the end of the
         section. No new image assets — gradients, box-shadow, pseudo-
         elements only. No animation is introduced here at all, so there is
         nothing for reduced-motion to disable (the only transition,
         border-color on the corner plates, predates this wave).
         ═══════════════════════════════════════════════════════════════════ */

      .hud-frame {
        /* Housing tokens — variants below re-point these, never the shadow
           composition itself, so a variant is a 4-line override. */
        --mat-hi: rgba(255, 255, 255, 0.075);
        --mat-lo: rgba(0, 0, 0, 0.55);
        --mat-side-hi: rgba(255, 255, 255, 0.025);
        --mat-side-lo: rgba(0, 0, 0, 0.3);
        --mat-well: rgba(0, 0, 0, 0.34);
        --mat-well-size: calc(22px * var(--density-scale, 1));
        --mat-drop: 0 2px 10px rgba(0, 0, 0, 0.45);
        --mat-depth:
          inset 0 1px 0 var(--mat-hi),
          inset 0 -1px 0 var(--mat-lo),
          inset 1px 0 0 var(--mat-side-hi),
          inset -1px 0 0 var(--mat-side-lo),
          inset 0 0 var(--mat-well-size) var(--mat-well);
        box-shadow: var(--mat-depth), var(--mat-drop);
      }

      /* Re-compose the glow treatments on top of the housing (see note above). */
      .hud-frame.game-panel-glow {
        box-shadow: var(--mat-depth), var(--mat-drop), 0 0 30px rgba(6, 182, 212, 0.05);
      }
      .hud-frame.game-glow-cyan {
        box-shadow: var(--mat-depth), var(--mat-drop), 0 0 15px rgba(6, 182, 212, 0.2), 0 0 40px rgba(6, 182, 212, 0.05);
      }
      .hud-frame.game-glow-purple {
        box-shadow: var(--mat-depth), var(--mat-drop), 0 0 15px rgba(139, 92, 246, 0.2), 0 0 40px rgba(139, 92, 246, 0.05);
      }
      .hud-frame.game-glow-green {
        box-shadow: var(--mat-depth), var(--mat-drop), 0 0 15px rgba(34, 197, 94, 0.2), 0 0 40px rgba(34, 197, 94, 0.05);
      }
      .hud-frame.game-glow-amber {
        box-shadow: var(--mat-depth), var(--mat-drop), 0 0 15px rgba(245, 158, 11, 0.2), 0 0 40px rgba(245, 158, 11, 0.05);
      }

      /* ── Frame variants keyed to MEANING (not decoration) ──────────────
         primary   — a lit console housing. The default; nothing to add.
         secondary — a recessed data well: bevel inverted (dark lip on top,
                     faint light catch on the bottom), no outer drop, deeper
                     vignette. Reads as "carved into the primary console".
         alert     — a primary housing with an amber hazard keyline ring and
                     amber corner plates. NON-COMBAT canon: a caution rail,
                     never damage/impact/weapon language.
         inert     — locked, mothballed, empty-state or unavailable. Flat,
                     desaturated, minimal light. Communicates "no power".
         Variants are additive classes, so a raw '.hud-frame' consumer can
         opt in without going through chrome.tsx. */
      .hud-frame.mat-secondary {
        --mat-hi: rgba(0, 0, 0, 0.5);
        --mat-lo: rgba(255, 255, 255, 0.05);
        --mat-side-hi: rgba(0, 0, 0, 0.28);
        --mat-side-lo: rgba(0, 0, 0, 0.28);
        --mat-well: rgba(0, 0, 0, 0.55);
        --mat-drop: 0 0 0 rgba(0, 0, 0, 0);
        --hud-color: rgba(34, 211, 238, 0.22);
      }
      .hud-frame.mat-alert {
        --hud-color: rgba(245, 158, 11, 0.6);
        --mat-hi: rgba(253, 230, 138, 0.14);
        --mat-drop: 0 2px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(245, 158, 11, 0.2);
      }
      .hud-frame.mat-inert {
        --hud-color: rgba(148, 163, 184, 0.22);
        --mat-hi: rgba(255, 255, 255, 0.028);
        --mat-lo: rgba(0, 0, 0, 0.35);
        --mat-side-hi: rgba(255, 255, 255, 0.012);
        --mat-side-lo: rgba(0, 0, 0, 0.18);
        --mat-well: rgba(0, 0, 0, 0.2);
        --mat-drop: 0 1px 4px rgba(0, 0, 0, 0.3);
      }

      /* ── Corner plates — the brackets promoted to milled hardware ──────
         Same four pseudo/child elements as before (no markup change), now
         slightly larger, 2px on the visible edges, and carrying a small
         filled diagonal nub so the corner reads as a bolted plate rather
         than a hairline tick. Size rides --density-scale. */
      .hud-frame::before,
      .hud-frame::after,
      .hud-frame > .hud-corner-bl,
      .hud-frame > .hud-corner-br {
        width: calc(13px * var(--density-scale, 1));
        height: calc(13px * var(--density-scale, 1));
        background-repeat: no-repeat;
        background-size: 5px 5px;
      }
      .hud-frame::before {
        border-width: 2px 0 0 2px;
        background-image: linear-gradient(135deg, var(--hud-color), transparent 85%);
        background-position: top left;
      }
      .hud-frame::after {
        border-width: 2px 2px 0 0;
        background-image: linear-gradient(225deg, var(--hud-color), transparent 85%);
        background-position: top right;
      }
      .hud-frame > .hud-corner-bl {
        border-width: 0 0 2px 2px;
        background-image: linear-gradient(45deg, var(--hud-color), transparent 85%);
        background-position: bottom left;
      }
      .hud-frame > .hud-corner-br {
        border-width: 0 2px 2px 0;
        background-image: linear-gradient(315deg, var(--hud-color), transparent 85%);
        background-position: bottom right;
      }

      /* ── Edge hardware layer — opted into by chrome.tsx primitives ─────
         A single decorative, pointer-events-none child span. Four screw
         dots inboard of the corner plates plus a ticked ruler down each
         side edge. Purely CSS gradients; suppressed under 640px where the
         detail would crowd a phone's content column, and under
         high-contrast where the low-alpha detailing is noise rather than
         signal. Never carries information (aria-hidden at the call site). */
      .mat-hardware {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        border-radius: inherit;
        background-image:
          radial-gradient(circle at 11px 11px, rgba(255, 255, 255, 0.17) 0 1.1px, transparent 1.7px),
          radial-gradient(circle at calc(100% - 11px) 11px, rgba(255, 255, 255, 0.17) 0 1.1px, transparent 1.7px),
          radial-gradient(circle at 11px calc(100% - 11px), rgba(255, 255, 255, 0.1) 0 1.1px, transparent 1.7px),
          radial-gradient(circle at calc(100% - 11px) calc(100% - 11px), rgba(255, 255, 255, 0.1) 0 1.1px, transparent 1.7px);
      }
      .mat-hardware::before,
      .mat-hardware::after {
        content: '';
        position: absolute;
        top: 26%;
        bottom: 26%;
        width: 2px;
        background: repeating-linear-gradient(to bottom, var(--hud-color) 0 2px, transparent 2px 7px);
        opacity: 0.45;
      }
      .mat-hardware::before { left: 0; }
      .mat-hardware::after  { right: 0; }
      @media (max-width: 640px) {
        .mat-hardware::before,
        .mat-hardware::after { display: none; }
      }

      /* ── Header rail — a lit seam under a ConsolePanel's header band, so
         the header reads as a separate machined face of the same housing. */
      .mat-rail {
        position: relative;
      }
      .mat-rail::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 1px;
        background: linear-gradient(90deg, var(--hud-color), rgba(255, 255, 255, 0.05) 45%, transparent 85%);
        pointer-events: none;
      }

      /* ── HoloCard materiality — repeated items *inside* a console read as
         shallow wells stamped into the housing face, not as floating tiles.
         Deliberately NOT '.hud-frame': corner plates on every list row would
         be visual noise (and '.hud-frame''s bottom two plates need markup
         spans, so a bracketed card would be asymmetric). Same --mat-* token
         vocabulary, one notch shallower. */
      .holo-card {
        --mat-hi: rgba(0, 0, 0, 0.35);
        --mat-lo: rgba(255, 255, 255, 0.04);
        --mat-well: rgba(0, 0, 0, 0.4);
        box-shadow:
          inset 0 1px 0 var(--mat-hi),
          inset 0 -1px 0 var(--mat-lo),
          inset 0 0 calc(16px * var(--density-scale, 1)) var(--mat-well);
      }
      /* Raised variant — a card that is an actionable console button rather
         than a data well (build options, selectable modules). */
      .holo-card.mat-primary {
        --mat-hi: rgba(255, 255, 255, 0.07);
        --mat-lo: rgba(0, 0, 0, 0.5);
        --mat-well: rgba(0, 0, 0, 0.22);
        box-shadow:
          inset 0 1px 0 var(--mat-hi),
          inset 0 -1px 0 var(--mat-lo),
          inset 0 0 calc(16px * var(--density-scale, 1)) var(--mat-well),
          0 1px 6px rgba(0, 0, 0, 0.4);
      }
      .holo-card.mat-alert {
        box-shadow:
          inset 0 1px 0 rgba(253, 230, 138, 0.12),
          inset 0 -1px 0 rgba(0, 0, 0, 0.5),
          inset 0 0 calc(16px * var(--density-scale, 1)) rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(245, 158, 11, 0.2);
      }
      .holo-card.mat-inert {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.02),
          inset 0 0 calc(12px * var(--density-scale, 1)) rgba(0, 0, 0, 0.18);
        opacity: 0.72;
      }
      html.high-contrast .holo-card.mat-inert { opacity: 0.9; }
      html.high-contrast .holo-card {
        --mat-hi: rgba(0, 0, 0, 0.7) !important;
        --mat-lo: rgba(255, 255, 255, 0.22) !important;
        --mat-well: rgba(0, 0, 0, 0.12) !important;
      }

      /* ── High-contrast: the housing must stay legible when the low-alpha
         detailing is boosted. Strengthen the bevel lips (the depth cue) and
         drop the decorative hardware layer entirely (it is noise at high
         contrast, and it carries no information by contract). ─────────── */
      html.high-contrast .hud-frame {
        --mat-hi: rgba(255, 255, 255, 0.3) !important;
        --mat-lo: rgba(0, 0, 0, 0.85) !important;
        --mat-side-hi: rgba(255, 255, 255, 0.14) !important;
        --mat-side-lo: rgba(0, 0, 0, 0.6) !important;
        --mat-well: rgba(0, 0, 0, 0.15) !important;
      }
      html.high-contrast .hud-frame.mat-secondary {
        --mat-hi: rgba(0, 0, 0, 0.85) !important;
        --mat-lo: rgba(255, 255, 255, 0.3) !important;
      }
      html.high-contrast .mat-hardware { display: none; }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE A1 — NUMERIC READOUT TYPOGRAPHY (docs/VISUAL_AAA_2026-08.md §A1.2)
         MoO2 is readable at a glance because figures are chunky, tabular and
         icon-adjacent, and the label/value hierarchy is unambiguous. These
         classes back the <StatReadout>/<Figure> primitives in chrome.tsx.
         Type floor (V8 canon) is respected: nothing here is below 10px.
         ═══════════════════════════════════════════════════════════════════ */

      /* Every figure in the game — the one rule that guarantees columns of
         numbers line up. Applied by <Figure>, and retro-applied to the two
         table primitives so existing tables inherit it without edits. */
      .mat-figure,
      .holo-table td,
      .holo-table th,
      .holo-row .game-number {
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum' 1, 'lnum' 1;
      }
      /* NOTE: deliberately sets no 'color'. styled-jsx global rules are
         injected after the Tailwind sheet, so a colour here would outrank
         every 'text-green-400'-style tint call sites pass in — figures
         inherit instead, and the Figure/StatReadout components supply a
         bright default in Tailwind-land, where a caller can override it. */
      .mat-figure {
        font-family: var(--font-hud), var(--font-mono), ui-monospace, monospace;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.05;
        white-space: nowrap;
      }
      /* Unit/suffix rides at 0.72em and steps down one contrast notch, so
         "$1.2" reads as the number and "M/mo" reads as the unit — the MoO2
         "big number, small unit" composition. */
      .mat-unit {
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-size: 0.72em;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: #94a3b8;
        margin-left: 0.15em;
      }
      /* Stat block: label above, icon + value below, aligned as a column so
         a row of readouts forms a proper instrument cluster. */
      .mat-stat {
        display: flex;
        flex-direction: column;
        gap: calc(3px * var(--density-scale, 1));
        min-width: 0;
      }
      .mat-stat-label {
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #64748b;
        line-height: 1.2;
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .mat-stat-value {
        display: flex;
        align-items: baseline;
        gap: 5px;
        min-width: 0;
      }
      /* Icon sits on the value's baseline row, never above the label — the
         "icon inline with the value" rule. align-self keeps it optically
         centered against a taller numeral. */
      .mat-stat-value > .game-icon {
        align-self: center;
      }
      .mat-stat-sub {
        font-size: 10px;
        line-height: 1.25;
        color: #64748b;
      }
      /* Trend/sign token. Colour is ALWAYS redundant with the glyph and the
         explicit +/- sign carried in the text, per CLAUDE.md colourblind
         canon — removing all colour must not remove any meaning. */
      .mat-trend {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-family: var(--font-hud), var(--font-mono), ui-monospace, monospace;
        font-variant-numeric: tabular-nums;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .mat-trend-up   { color: #4ade80; }
      .mat-trend-down { color: #f87171; }
      .mat-trend-flat { color: #94a3b8; }
      html.high-contrast .mat-trend-up   { color: #86efac; }
      html.high-contrast .mat-trend-down { color: #fca5a5; }
      html.high-contrast .mat-trend-flat { color: #cbd5e1; }
      html.high-contrast .mat-stat-label { color: #94a3b8; }
      html.high-contrast .mat-unit       { color: #cbd5e1; }

      /* Dense numeric table: right-aligned tabular figure columns with a
         hairline column rule, the MoO2 ledger look. Opt-in via .mat-table
         on an existing .holo-table (additive, no markup change needed). */
      .mat-table td.mat-num,
      .mat-table th.mat-num {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .mat-table tbody tr > td {
        border-top: 1px solid rgba(255, 255, 255, 0.04);
      }
      html.high-contrast .mat-table tbody tr > td {
        border-top-color: rgba(255, 255, 255, 0.18);
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE A2.1 — DOCKED COMMAND BEZEL (docs/VISUAL_AAA_2026-08.md §A2.1)
         Sins of a Solar Empire benchmark: the UI is a fixed machined bezel
         around a live theatre. Panels dock INTO the chrome; they do not
         float on a page. Ours was a web header above a content column.

         This is A1.1's housing language applied to the SHELL rather than to
         individual panels — same --mat-* vocabulary, same box-shadow-only
         construction, no second system. Five pieces:

           .bezel-surround   a fixed, pointer-events-none overlay painting the
                             console surround + the lip that seats the stage
                             inside it. Zero layout cost by construction.
           .bezel-plate-top  the ResourceBar as the top bezel plate.
           .bezel-selector   the tab strip as a machined selector channel,
                             with .bezel-key for the individual keys.
           .bezel-utility    the trailing console switches, recessed.
           .bezel-rail       the Outliner (all three responsive variants) as
                             the side/bottom bezel plate.

         LAYOUT CONTRACT — LOAD-BEARING. Nothing in this section sets
         padding, margin, width, height, or any box-model property. Every
         rule paints with background-image and box-shadow only. That is why
         the bezel cannot steal a single pixel of content height at 375px:
         there is no pixel for it to take. The mobile degradation below is
         therefore about VISUAL noise (thinner plate, no corner gussets,
         weaker vignette), not about reclaiming space.

         Composition rule inherited from A1.1: classes that co-apply with
         '.hud-frame' must never set 'box-shadow' directly — they re-point
         the --mat-* tokens instead, or the housing is silently erased.

         No animation is introduced here at all. A bezel is the most
         persistent surface in the game; motion on it would be a permanent
         distraction, so there is nothing for reduced-motion to disable.
         ═══════════════════════════════════════════════════════════════════ */

      .bezel-shell {
        /* Plate thickness. Phone-first: a hairline edge, promoted to a real
           machined surround only where there are pixels to spare. */
        --bezel-t: 1px;
        --bezel-plate: rgba(6, 10, 20, 0.92);
        --bezel-lip-hi: rgba(255, 255, 255, 0.07);
        --bezel-lip-lo: rgba(0, 0, 0, 0.6);
        --bezel-vignette: rgba(0, 0, 0, 0.2);
        --bezel-corner: rgba(148, 163, 184, 0.16);
        /* Brushed-metal face: a 1px vertical comb at 3px pitch. Sub-pixel
           on HiDPI, which is the point — it reads as machining, not stripes. */
        --bezel-brush: repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.016) 0 1px,
          rgba(0, 0, 0, 0.016) 1px 3px
        );
      }
      @media (min-width: 640px) {
        .bezel-shell {
          --bezel-t: 3px;
          --bezel-vignette: rgba(0, 0, 0, 0.28);
        }
      }
      @media (min-width: 1024px) {
        .bezel-shell {
          --bezel-t: 4px;
          --bezel-vignette: rgba(0, 0, 0, 0.34);
        }
      }

      /* ── The surround ─────────────────────────────────────────────────
         A single decorative overlay. Fixed to the viewport, so it frames the
         theatre rather than scrolling with it, and pointer-events:none so it
         is invisible to every interaction underneath.

         z-index 25 is chosen deliberately: ABOVE the stage and the
         ResourceBar (z-20) so the plate genuinely overlaps and frames them,
         but BELOW the Outliner rail/drawer (z-30/40) and every modal
         (z-70+) — a viewport vignette must never dim a dialog the player is
         reading, and the rail is itself a bezel plate (below), so it is
         meant to sit on top of the surround's right edge.

         The four inset rings stack outside-in: box-shadow paints earlier
         shadows on top, so the smaller plate ring covers the larger lip
         ring except for the 1px band between them. */
      .bezel-surround {
        position: fixed;
        inset: 0;
        z-index: 25;
        pointer-events: none;
        box-shadow:
          inset 0 0 0 var(--bezel-t) var(--bezel-plate),
          inset 0 0 0 calc(var(--bezel-t) + 1px) var(--bezel-lip-hi),
          inset 0 0 0 calc(var(--bezel-t) + 2px) var(--bezel-lip-lo),
          inset 0 0 48px var(--bezel-vignette);
      }
      /* Machined corner gussets — four corner-anchored gradient blocks, so
         no extra markup is needed. Desktop only: at phone width the corners
         are where the content column already runs closest to the edge. */
      @media (min-width: 1024px) {
        .bezel-surround {
          background-image:
            linear-gradient(135deg, var(--bezel-corner), transparent 62%),
            linear-gradient(225deg, var(--bezel-corner), transparent 62%),
            linear-gradient(45deg, var(--bezel-corner), transparent 62%),
            linear-gradient(315deg, var(--bezel-corner), transparent 62%);
          background-repeat: no-repeat;
          background-size: 38px 38px;
          background-position: top left, top right, bottom left, bottom right;
        }
      }
      /* High contrast: the vignette is decorative dimming and actively hurts
         here, so it goes; the lip becomes a hard, unambiguous edge. */
      html.high-contrast .bezel-surround {
        --bezel-lip-hi: rgba(255, 255, 255, 0.34);
        --bezel-lip-lo: rgba(0, 0, 0, 0.9);
        --bezel-vignette: rgba(0, 0, 0, 0);
        --bezel-corner: rgba(203, 213, 225, 0.4);
      }

      /* ── Top plate (ResourceBar) ──────────────────────────────────────
         Co-applied with '.hud-frame', so it re-points tokens instead of
         setting box-shadow (A1.1 composition rule). The background-image is
         free: the call site sets bg-black/90, a background-COLOR. */
      .hud-frame.bezel-plate-top {
        --mat-hi: rgba(255, 255, 255, 0.1);
        --mat-lo: rgba(0, 0, 0, 0.7);
        --mat-well: rgba(0, 0, 0, 0.18);
        --mat-drop: 0 2px 0 rgba(0, 0, 0, 0.65), 0 6px 18px rgba(0, 0, 0, 0.55);
        background-image:
          linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 42%, rgba(0, 0, 0, 0.3) 100%),
          var(--bezel-brush);
      }
      /* The seam where the top plate meets the selector channel below it —
         a lit hairline, the same trick .mat-rail plays under a panel header. */
      .bezel-seam {
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 1px;
        pointer-events: none;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(34, 211, 238, 0.28) 18%,
          rgba(255, 255, 255, 0.09) 50%,
          rgba(34, 211, 238, 0.28) 82%,
          transparent 100%
        );
      }
      html.high-contrast .bezel-seam {
        background: rgba(255, 255, 255, 0.45);
      }

      /* ── Selector channel (tab strip) ─────────────────────────────────
         A recessed machined channel milled into the console face, with the
         tabs as keys seated in it. Dark lip on top + light catch on the
         bottom is the same inversion '.mat-secondary' uses for a data well,
         so the channel reads as carved out of the top plate above it. */
      .bezel-selector {
        background-image:
          linear-gradient(180deg, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0.16) 55%, rgba(255, 255, 255, 0.012) 100%),
          var(--bezel-brush);
        box-shadow:
          inset 0 2px 4px rgba(0, 0, 0, 0.55),
          inset 0 -1px 0 rgba(255, 255, 255, 0.045);
      }
      /* A key. Raised, catching light from above — until it is the active
         one, at which point it is pressed INTO the channel. The pressed
         state is a geometry change (bevel inverts, key sits in shadow), so
         it survives greyscale on its own; the existing .game-tab-active
         gradient underline and the text-colour change remain as the other
         two redundant carriers. */
      .bezel-key {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          inset 0 -1px 0 rgba(0, 0, 0, 0.4);
      }
      .bezel-key.game-tab-active {
        box-shadow:
          inset 0 2px 5px rgba(0, 0, 0, 0.65),
          inset 0 -1px 0 rgba(255, 255, 255, 0.07),
          0 0 12px rgba(34, 211, 238, 0.12);
      }
      html.high-contrast .bezel-key {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.28),
          inset 0 -1px 0 rgba(0, 0, 0, 0.85);
      }
      html.high-contrast .bezel-key.game-tab-active {
        box-shadow:
          inset 0 2px 5px rgba(0, 0, 0, 0.95),
          inset 0 -1px 0 rgba(255, 255, 255, 0.4);
      }
      /* Trailing console switches (tutorial / FAQ / achievements / save /
         restart / quit) — a small recessed sub-plate so they read as a
         separate bank of switches rather than more navigation. */
      .bezel-utility {
        box-shadow:
          inset 0 1px 2px rgba(0, 0, 0, 0.5),
          inset 0 -1px 0 rgba(255, 255, 255, 0.03),
          inset 1px 0 0 rgba(255, 255, 255, 0.035);
        border-radius: 8px;
      }

      /* ── Side / bottom plate (Outliner, all three variants) ───────────
         The rail is the right bezel plate on desktop; the mid-viewport glyph
         tab and the phone status strip are the same plate rotated to
         whichever edge they dock to. Directional lip + brushed face. */
      .bezel-rail {
        background-image:
          linear-gradient(90deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.008) 26%, rgba(0, 0, 0, 0.22) 100%),
          var(--bezel-brush);
        box-shadow:
          inset 1px 0 0 rgba(255, 255, 255, 0.075),
          -2px 0 0 rgba(0, 0, 0, 0.55),
          -8px 0 20px rgba(0, 0, 0, 0.4);
      }
      .bezel-rail-left {
        background-image:
          linear-gradient(270deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.008) 26%, rgba(0, 0, 0, 0.22) 100%),
          var(--bezel-brush);
        box-shadow:
          inset -1px 0 0 rgba(255, 255, 255, 0.075),
          2px 0 0 rgba(0, 0, 0, 0.55),
          8px 0 20px rgba(0, 0, 0, 0.4);
      }
      .bezel-rail-bottom {
        background-image:
          linear-gradient(0deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.008) 40%, rgba(0, 0, 0, 0.25) 100%),
          var(--bezel-brush);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.075),
          0 -2px 0 rgba(0, 0, 0, 0.55),
          0 -8px 20px rgba(0, 0, 0, 0.4);
      }
      html.high-contrast .bezel-rail,
      html.high-contrast .bezel-rail-left,
      html.high-contrast .bezel-rail-bottom,
      html.high-contrast .bezel-selector,
      html.high-contrast .bezel-utility {
        background-image: none;
      }
      /* The brushed comb is sub-pixel decoration; on a phone it costs a
         full-viewport repeating gradient for detail nobody can resolve. */
      @media (max-width: 640px) {
        .bezel-shell { --bezel-brush: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE A2.3 — PORTRAIT-FRAMED LEADER MOMENTS
         (docs/VISUAL_AAA_2026-08.md §A2.3)

         Master of Orion 2's personality came from leaders APPEARING: a large
         framed portrait in ornate housing delivering a decision. The housing
         below is A1.1's bevel vocabulary given a crest, gussets and rivets —
         one notch more ornate than a panel, because this surface appears
         rarely and is meant to feel like an occasion.

         ── THE FRAME'S REAL JOB: NORMALIZING THE PORTRAIT LIBRARY ─────────
         The art library is not homogeneous. It carries painterly busts on
         clean navy backgrounds AND legacy photoreal portraits with busy
         environmental backgrounds (labs, thrones, machinery), several of
         which also carry garbled pseudo-text on clothing and screens. Put
         side by side in large frames, that split shows.

         This is exactly the problem MoO2's frames solved, and the treatment
         here is FOUR cooperating layers, all inside .leader-portrait:

           1. FIXED FOCAL CROP. A 4:5 window with object-fit:cover. Every
              source in the library is square, so the crop is horizontal
              only: vertical framing is preserved (heads already land in the
              upper third in both cohorts) while ~20% is taken off each side.
              That side crop is doing double duty — it is where the busiest
              periphery lives, including most of the garbled holo-panel
              pseudo-text.
           2. UNIFYING COLOUR CAST. saturation pulled to 0.86 with a small
              contrast lift, then a 12% navy wash. This is what drags a
              photoreal frame toward the painterly cohort's palette; both
              cohorts land on the same blue-grey ground.
           3. INNER VIGNETTE, focus point biased to the face (50%/32%), fully
              transparent for the middle 55% so no face is ever dimmed, then
              ramping hard to near-black at the rim. Busy backgrounds die at
              the edges; clean ones simply gain depth.
           4. SEATING SHADOW + BOTTOM FADE. An inset shadow seats every
              portrait at the same depth in the housing, and a bottom fade
              dissolves the lower third into the name plate, so the subject
              emerges from the frame rather than being pasted into it. The
              lower third is also where clothing pseudo-text sits.

         Calibrated by compositing real portraits from both cohorts through
         these exact layers offline and comparing three strengths; a heavier
         pass knocked the legacy backgrounds down further but went muddy on
         the painterly cohort's faces, which is the wrong trade.

         Accessibility: the portrait is decorative (alt="" at the call site)
         — the name, title, affiliation and message carry all the meaning, so
         the frame degrades to a monogram plate with zero information loss
         when a speaker has no art. Colour appears only as the accent keyline,
         always redundant with the affiliation text beside it.
         ═══════════════════════════════════════════════════════════════════ */

      .leader-housing {
        --leader-accent: #22d3ee;
        position: relative;
        border-radius: 18px;
        background:
          linear-gradient(180deg, rgba(18, 22, 40, 0.97) 0%, rgba(7, 9, 20, 0.98) 55%, rgba(4, 5, 12, 0.99) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.11),
          inset 0 -1px 0 rgba(0, 0, 0, 0.75),
          inset 1px 0 0 rgba(255, 255, 255, 0.035),
          inset -1px 0 0 rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.06),
          0 24px 60px rgba(0, 0, 0, 0.75);
      }
      /* Crest — a lit rail across the top of the housing, tinted by the
         speaker's accent. The ornate flourish that says "occasion". */
      .leader-housing::before {
        content: '';
        position: absolute;
        top: 0;
        left: 12%;
        right: 12%;
        height: 2px;
        border-radius: 0 0 3px 3px;
        background: linear-gradient(90deg, transparent, var(--leader-accent), transparent);
        opacity: 0.8;
        pointer-events: none;
      }
      /* Machined corner gussets + rivets, one decorative layer, no markup. */
      .leader-housing::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background-image:
          linear-gradient(135deg, rgba(148, 163, 184, 0.2), transparent 60%),
          linear-gradient(225deg, rgba(148, 163, 184, 0.2), transparent 60%),
          linear-gradient(45deg, rgba(148, 163, 184, 0.12), transparent 60%),
          linear-gradient(315deg, rgba(148, 163, 184, 0.12), transparent 60%),
          radial-gradient(circle at 14px 14px, rgba(255, 255, 255, 0.2) 0 1.2px, transparent 1.9px),
          radial-gradient(circle at calc(100% - 14px) 14px, rgba(255, 255, 255, 0.2) 0 1.2px, transparent 1.9px);
        background-repeat: no-repeat;
        background-size: 30px 30px, 30px 30px, 30px 30px, 30px 30px, 100% 100%, 100% 100%;
        background-position: top left, top right, bottom left, bottom right, 0 0, 0 0;
      }
      html.high-contrast .leader-housing::after { background-image: none; }

      /* ── The portrait window ──────────────────────────────────────────── */
      .leader-portrait {
        position: relative;
        aspect-ratio: 4 / 5;
        overflow: hidden;
        border-radius: 10px;
        background: radial-gradient(ellipse at 50% 30%, #17203a 0%, #070a14 75%);
        box-shadow:
          inset 0 0 0 1px rgba(125, 211, 252, 0.3),
          inset 0 2px 14px rgba(0, 0, 0, 0.85),
          0 2px 10px rgba(0, 0, 0, 0.6);
      }
      .leader-portrait > img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        /* Square sources crop horizontally only, so this mainly guards any
           future non-square art: keep the head, sacrifice the feet. */
        object-position: 50% 12%;
        /* Layer 2 — the unifying cast, half of it. */
        filter: saturate(0.86) contrast(1.06) brightness(0.97);
      }
      /* Layers 2b/3/4 as one non-interactive overlay. */
      .leader-portrait-treatment {
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
        background:
          /* bottom fade into the name plate */
          linear-gradient(180deg, rgba(4, 6, 15, 0) 55%, rgba(4, 6, 15, 0.8) 100%),
          /* inner vignette, focus biased to the face */
          radial-gradient(ellipse 72% 72% at 50% 32%, rgba(2, 4, 10, 0) 0%, rgba(2, 4, 10, 0) 55%, rgba(2, 4, 10, 0.85) 100%),
          /* navy cast */
          linear-gradient(0deg, rgba(13, 27, 51, 0.12), rgba(13, 27, 51, 0.12));
      }
      /* High contrast: the cast and vignette are decorative dimming and
         reduce legibility of the art itself, so they go. The keyline stays
         and hardens — the frame's job there is a clear boundary. */
      html.high-contrast .leader-portrait > img { filter: none; }
      html.high-contrast .leader-portrait-treatment { background: none; }
      html.high-contrast .leader-portrait {
        box-shadow:
          inset 0 0 0 2px rgba(186, 230, 253, 0.75),
          0 2px 10px rgba(0, 0, 0, 0.6);
      }

      /* Fallback when a speaker has no portrait art — a monogram plate, never
         a broken image. Same window geometry so layout never shifts. */
      .leader-monogram {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-hud), ui-sans-serif, system-ui, sans-serif;
        font-weight: 800;
        font-size: clamp(28px, 9vw, 48px);
        letter-spacing: 0.06em;
        color: rgba(226, 232, 240, 0.72);
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
      }

      /* ── Name plate ───────────────────────────────────────────────────── */
      .leader-plate {
        position: relative;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(0, 0, 0, 0.3));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.09),
          inset 0 -1px 0 rgba(0, 0, 0, 0.55);
      }
      .leader-plate::after {
        content: '';
        position: absolute;
        left: 8px;
        right: 8px;
        bottom: 0;
        height: 1px;
        background: linear-gradient(90deg, var(--leader-accent), transparent 80%);
        opacity: 0.65;
        pointer-events: none;
      }

      /* ── Entrance ─────────────────────────────────────────────────────────
         A leader arriving should land, once. 260ms, no loop, no persistent
         compositing work. Reduced motion collapses it to a plain appearance —
         the final frame is identical either way. */
      @keyframes leader-arrive {
        from { opacity: 0; transform: translateY(10px) scale(0.985); }
        to   { opacity: 1; transform: none; }
      }
      .leader-arrive {
        animation: leader-arrive 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .leader-arrive { animation: none; }
      }

      /* ═══════════════════════════════════════════════════════════════════
         WAVE A4.2 — OUTLINER ROW FLASH (docs/VISUAL_AAA_2026-08.md §A4.2)
         V3 documented a row-DOM convention "for the V7 juice pass — money-
         flash the outliner row on build/order completion", V7 shipped the
         map-ping bus, and nothing ever joined them. map-ping.ts now supplies
         the selector + class names; these are the paints.

         Colourblind-safe: the dominant channel is LUMINANCE — the row lifts
         out of the rail and settles back. The green/cyan tint is a second,
         redundant channel, and the row's own text (built count, ETA, status)
         has already changed anyway, so the flash carries no unique meaning.
         Reduced motion collapses both to the single short opacity blink V7
         established as the house reduced-motion ping treatment.
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes outliner-flash-complete {
        0%   { background-color: rgba(52, 211, 153, 0.3); box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.55); }
        100% { background-color: rgba(52, 211, 153, 0); box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0); }
      }
      @keyframes outliner-flash-ack {
        0%   { background-color: rgba(34, 211, 238, 0.24); box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.45); }
        100% { background-color: rgba(34, 211, 238, 0); box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0); }
      }
      .outliner-row-flash-complete {
        animation: outliner-flash-complete 900ms ease-out both;
      }
      .outliner-row-flash-ack {
        animation: outliner-flash-ack 900ms ease-out both;
      }
      html.high-contrast .outliner-row-flash-complete,
      html.high-contrast .outliner-row-flash-ack {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: -2px;
      }
      @media (prefers-reduced-motion: reduce) {
        @keyframes outliner-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        .outliner-row-flash-complete,
        .outliner-row-flash-ack {
          animation: outliner-blink 200ms linear 1;
        }
      }
    `}</style>
  );
}
