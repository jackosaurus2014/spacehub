'use client';

/**
 * AAA-quality game CSS styles, animations, and visual effects.
 * Implements glassmorphism, neon glow, particle shimmer, and
 * cinematic micro-interactions for a premium game feel.
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
        font-size: 8px;
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
        font-size: 9px;
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
        font-size: 9px;
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
    `}</style>
  );
}
